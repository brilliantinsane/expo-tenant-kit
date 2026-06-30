import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { dirname, resolve } from 'pathe';

import {
  formatSupportedGeneratedSetupTypes,
  generateProject,
  normalizeGeneratedSetupType,
  preflightWriteProject,
  SUPPORTED_PUBLIC_SETUP_SLUGS,
  writeProject,
  type GeneratedSetupType,
  type GeneratedSetupTypeInput,
  type PublicSetupSlug,
  type VirtualFileTree,
  type WriteProjectResult,
} from '@tenkit/template-generator';

export const DEFAULT_PROJECT_NAME = 'tenkit-app';
export const DEFAULT_PUBLIC_SETUP_SLUG: PublicSetupSlug = 'white-label';

export type PublicCliGitMode = false | 'init' | 'commit' | 'none';

export type CreateCommandOptions = {
  name?: string;
  packageName?: string;
  setup?: string;
  setupType?: string;
  yes?: boolean;
  install?: boolean;
  git?: PublicCliGitMode;
  dryRun?: boolean;
};

export type PromptChoice = {
  value: PublicSetupSlug;
  label: string;
};

export const SETUP_PROMPT_CHOICES = [
  { value: 'white-label', label: 'White Label Apps' },
  { value: 'runtime-tenants', label: 'Runtime Tenant App' },
  { value: 'generic-standalone', label: 'Generic + Standalone Apps' },
] as const satisfies readonly PromptChoice[];

export type PromptAdapter = {
  text(options: {
    message: string;
    initialValue: string;
    validate(value: string | undefined): string | undefined;
  }): Promise<string | typeof PROMPT_CANCELLED>;
  select(options: {
    message: string;
    initialValue: PublicSetupSlug;
    options: readonly PromptChoice[];
  }): Promise<PublicSetupSlug | typeof PROMPT_CANCELLED>;
  confirm(options: {
    message: string;
    initialValue: boolean;
  }): Promise<boolean | typeof PROMPT_CANCELLED>;
};

export type CommandResult = {
  ok: boolean;
  code: number;
};

export type RunCommandOptions = {
  stdio?: 'inherit' | 'ignore';
};

export type RunCommand = (
  command: string,
  args: readonly string[],
  cwd: string,
  options?: RunCommandOptions,
) => Promise<CommandResult>;

export type CreateFlowOutput = {
  log(message?: string): void;
  error(message: string): void;
};

export type CreateFlowEnvironment = {
  cwd: string;
  workspaceRoot?: string;
  packageRoot?: string;
  isInteractive: boolean;
  isCi: boolean;
  output: CreateFlowOutput;
  prompts: PromptAdapter;
  runCommand?: RunCommand;
  generate?: (config: {
    setupType: GeneratedSetupType;
    projectName: string;
    packageName: string;
  }) => VirtualFileTree;
  write?: (options: {
    targetDir: string;
    tree: VirtualFileTree;
    forbiddenTargetRoots: readonly string[];
  }) => Promise<WriteProjectResult>;
};

export type CreateFlowResult = {
  status: 'created' | 'dry-run' | 'cancelled';
  targetDir: string;
  projectName: string;
  packageName: string;
  setupType: GeneratedSetupType;
  installed: boolean;
  installFailed: boolean;
  gitInitialized: boolean;
  gitCommitted: boolean;
  gitSkippedReason?: string;
  gitFailed: boolean;
};

export const PROMPT_CANCELLED = Symbol('prompt-cancelled');

type ResolvedCreateOptions = {
  projectName: string;
  packageName: string;
  setupType: GeneratedSetupType;
  targetDir: string;
  install: boolean;
  git: PublicCliGitMode | undefined;
  dryRun: boolean;
};

type PackageJsonShape = {
  name?: unknown;
};

function isPathSeparatorPresent(value: string): boolean {
  return value.includes('/') || value.includes('\\');
}

export function validateProjectName(value: string): string {
  const projectName = value.trim();

  if (projectName.length === 0) {
    throw new Error('Project name is required.');
  }

  if (projectName === '.' || projectName === '..') {
    throw new Error('Project name must be a child folder name.');
  }

  if (isPathSeparatorPresent(projectName)) {
    throw new Error('Project name must not contain path separators.');
  }

  if (/[\0-\x1F<>:"|?*]/.test(projectName)) {
    throw new Error('Project name contains characters that are unsafe for a project folder.');
  }

  return projectName;
}

function slugifyPackageName(projectName: string): string {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function validatePackageName(value: string): string {
  const packageName = value.trim();

  if (packageName.length === 0) {
    throw new Error('Package name is required.');
  }

  if (packageName.length > 214) {
    throw new Error('Package name must be 214 characters or fewer.');
  }

  if (packageName !== packageName.toLowerCase()) {
    throw new Error('Package name must be lowercase.');
  }

  if (isPathSeparatorPresent(packageName)) {
    throw new Error('Package name must not contain path separators.');
  }

  if (packageName.startsWith('.') || packageName.startsWith('_')) {
    throw new Error('Package name must not start with "." or "_".');
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
    throw new Error(
      'Package name must contain only lowercase letters, numbers, ".", "_", and "-".',
    );
  }

  return packageName;
}

export function derivePackageName(projectName: string): string {
  const packageName = slugifyPackageName(projectName);

  return validatePackageName(packageName);
}

export function normalizeSetupInput(
  setup: string | undefined,
  setupType: string | undefined,
): GeneratedSetupType {
  if (setup !== undefined && setupType !== undefined && setup !== setupType) {
    throw new Error('Use either --setup or --setup-type, not both with different values.');
  }

  const selectedSetup = setup ?? setupType ?? DEFAULT_PUBLIC_SETUP_SLUG;

  try {
    return normalizeGeneratedSetupType(selectedSetup);
  } catch {
    throw new Error(
      `Unsupported Setup Type ${JSON.stringify(selectedSetup)}. Expected ${formatSupportedGeneratedSetupTypes()}.`,
    );
  }
}

export function parseGitMode(value: unknown): PublicCliGitMode | undefined {
  if (value === false) {
    return false;
  }

  if (value === undefined) {
    return undefined;
  }

  if (value === 'init' || value === 'commit' || value === 'none') {
    return value;
  }

  throw new Error('Git mode must be one of: init, commit, none.');
}

async function readProjectName(
  options: CreateCommandOptions,
  env: CreateFlowEnvironment,
): Promise<string> {
  if (options.name !== undefined) {
    return validateProjectName(options.name);
  }

  if (options.yes) {
    return DEFAULT_PROJECT_NAME;
  }

  if (!env.isInteractive) {
    throw new Error('Missing --name. Pass --name or use --yes to accept the default.');
  }

  const answer = await env.prompts.text({
    message: 'Project name',
    initialValue: DEFAULT_PROJECT_NAME,
    validate(value) {
      try {
        validateProjectName(value ?? '');
        return undefined;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },
  });

  if (answer === PROMPT_CANCELLED) {
    throw new CreateFlowCancelledError();
  }

  return validateProjectName(answer);
}

async function readSetupType(
  options: CreateCommandOptions,
  env: CreateFlowEnvironment,
): Promise<GeneratedSetupType> {
  if (options.setup !== undefined || options.setupType !== undefined) {
    return normalizeSetupInput(options.setup, options.setupType);
  }

  if (options.yes) {
    return normalizeGeneratedSetupType(DEFAULT_PUBLIC_SETUP_SLUG);
  }

  if (!env.isInteractive) {
    throw new Error('Missing --setup. Pass --setup or use --yes to accept the default.');
  }

  const answer = await env.prompts.select({
    message: 'Setup Type',
    initialValue: DEFAULT_PUBLIC_SETUP_SLUG,
    options: SETUP_PROMPT_CHOICES,
  });

  if (answer === PROMPT_CANCELLED) {
    throw new CreateFlowCancelledError();
  }

  return normalizeGeneratedSetupType(answer);
}

async function assertTargetIsSafe(targetDir: string): Promise<void> {
  if (!(await fs.pathExists(targetDir))) {
    return;
  }

  const stats = await fs.stat(targetDir);

  if (!stats.isDirectory()) {
    throw new Error(`Generated project target ${targetDir} exists but is not a directory.`);
  }

  const entries = await fs.readdir(targetDir);

  if (entries.length > 0) {
    throw new Error(`Generated project target ${targetDir} already exists and is not empty.`);
  }
}

async function resolveOptions(
  options: CreateCommandOptions,
  env: CreateFlowEnvironment,
): Promise<ResolvedCreateOptions> {
  const projectName = await readProjectName(options, env);
  const setupType = await readSetupType(options, env);
  const packageName =
    options.packageName !== undefined
      ? validatePackageName(options.packageName)
      : derivePackageName(projectName);
  const targetDir = resolve(env.cwd, projectName);

  await assertTargetIsSafe(targetDir);

  return {
    projectName,
    packageName,
    setupType,
    targetDir,
    install: options.install !== false,
    git: parseGitMode(options.git),
    dryRun: options.dryRun === true,
  };
}

function defaultRunCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  return new Promise((resolveCommand) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: options.stdio ?? 'inherit',
    });

    child.on('error', () => {
      resolveCommand({ ok: false, code: 1 });
    });
    child.on('close', (code) => {
      resolveCommand({ ok: code === 0, code: code ?? 1 });
    });
  });
}

async function isGitAvailable(runCommand: RunCommand, cwd: string): Promise<boolean> {
  return (await runCommand('git', ['--version'], cwd, { stdio: 'ignore' })).ok;
}

async function isInsideGitWorktree(runCommand: RunCommand, cwd: string): Promise<boolean> {
  return (await runCommand('git', ['rev-parse', '--is-inside-work-tree'], cwd, { stdio: 'ignore' }))
    .ok;
}

async function resolveGitMode({
  explicitGitMode,
  env,
  runCommand,
  targetDir,
}: {
  explicitGitMode: PublicCliGitMode | undefined;
  env: CreateFlowEnvironment;
  runCommand: RunCommand;
  targetDir: string;
}): Promise<{ mode: false | 'init' | 'commit'; skippedReason?: string }> {
  if (explicitGitMode === false || explicitGitMode === 'none') {
    return { mode: false, skippedReason: 'disabled' };
  }

  if (!(await isGitAvailable(runCommand, targetDir))) {
    return { mode: false, skippedReason: 'git-unavailable' };
  }

  const insideGitWorktree = await isInsideGitWorktree(runCommand, targetDir);

  if (insideGitWorktree && explicitGitMode === undefined) {
    if (!env.isInteractive || env.isCi) {
      return { mode: false, skippedReason: 'nested-worktree' };
    }

    const answer = await env.prompts.confirm({
      message: 'Initialize a nested git repository?',
      initialValue: false,
    });

    if (answer === PROMPT_CANCELLED) {
      throw new CreateFlowCancelledError();
    }

    if (!answer) {
      return { mode: false, skippedReason: 'nested-worktree' };
    }
  }

  if (explicitGitMode === 'init') {
    return { mode: 'init' };
  }

  return { mode: 'commit' };
}

function logFinalOutput(result: CreateFlowResult, output: CreateFlowOutput): void {
  const projectShellArg = formatShellArg(result.projectName);

  output.log('');
  output.log(
    result.status === 'dry-run' ? 'Tenkit create plan is valid.' : 'Your Tenkit project is ready.',
  );
  output.log('');
  output.log('Next steps:');
  output.log(`- cd ${projectShellArg}`);

  if (result.installFailed || !result.installed) {
    output.log('- pnpm install');
  }

  output.log('- pnpm run android');
  output.log('- pnpm run ios');
  output.log('- pnpm run web');

  if (result.installFailed) {
    output.log('');
    output.log('Dependency installation failed. Run pnpm install in the generated project.');
  }

  if (result.gitSkippedReason === 'git-unavailable') {
    output.log('');
    output.log('Git was not available. Run git init when ready.');
  } else if (result.gitSkippedReason === 'nested-worktree') {
    output.log('');
    output.log(
      'Git initialization was skipped because the project is inside an existing git worktree.',
    );
  } else if (result.gitFailed) {
    output.log('');
    output.log(
      'Git setup did not complete. Run git init, git add --all, and git commit -m "Initial commit" when ready.',
    );
  }
}

export class CreateFlowCancelledError extends Error {
  constructor() {
    super('Create cancelled.');
  }
}

function formatShellArg(value: string): string {
  if (/^[A-Za-z0-9._/-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export async function runCreateFlow(
  options: CreateCommandOptions,
  env: CreateFlowEnvironment,
): Promise<CreateFlowResult> {
  const resolvedOptions = await resolveOptions(options, env);
  const runCommand = env.runCommand ?? defaultRunCommand;
  const generate = env.generate ?? generateProject;
  const write =
    env.write ??
    ((writeOptions) =>
      writeProject({
        ...writeOptions,
        overwrite: 'never',
      }));

  const tree = generate({
    setupType: resolvedOptions.setupType,
    projectName: resolvedOptions.projectName,
    packageName: resolvedOptions.packageName,
  });

  if (resolvedOptions.dryRun) {
    await preflightWriteProject({
      targetDir: resolvedOptions.targetDir,
      tree,
      overwrite: 'never',
      forbiddenTargetRoots: env.workspaceRoot ? [env.workspaceRoot] : [],
    });

    const result: CreateFlowResult = {
      status: 'dry-run',
      targetDir: resolvedOptions.targetDir,
      projectName: resolvedOptions.projectName,
      packageName: resolvedOptions.packageName,
      setupType: resolvedOptions.setupType,
      installed: false,
      installFailed: false,
      gitInitialized: false,
      gitCommitted: false,
      gitSkippedReason: 'dry-run',
      gitFailed: false,
    };

    logFinalOutput(result, env.output);
    return result;
  }

  const gitProbeCwd = (await fs.pathExists(resolvedOptions.targetDir))
    ? resolvedOptions.targetDir
    : env.cwd;
  const gitPlan = await resolveGitMode({
    explicitGitMode: resolvedOptions.git,
    env,
    runCommand,
    targetDir: gitProbeCwd,
  });
  const writeResult = await write({
    targetDir: resolvedOptions.targetDir,
    tree,
    forbiddenTargetRoots: env.workspaceRoot ? [env.workspaceRoot] : [],
  });
  let installed = false;
  let installFailed = false;

  if (resolvedOptions.install) {
    env.output.log('Installing dependencies with pnpm...');
    const installResult = await runCommand('pnpm', ['install'], writeResult.targetDir);
    installed = installResult.ok;
    installFailed = !installResult.ok;
  }

  let gitInitialized = false;
  let gitCommitted = false;
  let gitFailed = false;
  let gitSkippedReason: string | undefined;

  if (!gitPlan.mode) {
    gitSkippedReason = gitPlan.skippedReason;
  } else {
    const initResult = await runCommand('git', ['init'], writeResult.targetDir);
    gitInitialized = initResult.ok;

    if (!initResult.ok) {
      gitFailed = true;
    } else if (gitPlan.mode === 'commit') {
      const addResult = await runCommand('git', ['add', '--all'], writeResult.targetDir);
      const commitResult = addResult.ok
        ? await runCommand('git', ['commit', '-m', 'Initial commit'], writeResult.targetDir)
        : { ok: false, code: 1 };

      gitCommitted = commitResult.ok;
      gitFailed = !commitResult.ok;
    }
  }

  const result: CreateFlowResult = {
    status: 'created',
    targetDir: writeResult.targetDir,
    projectName: resolvedOptions.projectName,
    packageName: resolvedOptions.packageName,
    setupType: resolvedOptions.setupType,
    installed,
    installFailed,
    gitInitialized,
    gitCommitted,
    gitSkippedReason,
    gitFailed,
  };

  logFinalOutput(result, env.output);
  return result;
}

export async function findTenkitWorkspaceRoot(startUrl: string): Promise<string | undefined> {
  let current = dirname(fileURLToPath(startUrl));

  while (true) {
    const packageJsonPath = resolve(current, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = (await fs.readJson(packageJsonPath)) as PackageJsonShape;

      if (packageJson.name === 'tenkit-workspace') {
        return current;
      }
    }

    const parent = dirname(current);

    if (parent === current) {
      return undefined;
    }

    current = parent;
  }
}

export function isDirectCliRun(entryUrl: string, argvEntry: string | undefined): boolean {
  if (!argvEntry) {
    return false;
  }

  return resolveRealPath(fileURLToPath(entryUrl)) === resolveRealPath(argvEntry);
}

export function supportedSetupValues(): readonly GeneratedSetupTypeInput[] {
  return SUPPORTED_PUBLIC_SETUP_SLUGS;
}

function resolveRealPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}
