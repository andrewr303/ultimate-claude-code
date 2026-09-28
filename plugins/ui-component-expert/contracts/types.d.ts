/**
 * UI Component Expert - DesignContract Type Definitions
 * Schema Version: 1
 */

export type ConfidenceLevel = 'observed' | 'inferred' | 'unknown';

export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export type CanonicalState =
  | 'default'
  | 'hover'
  | 'focus'
  | 'active'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'selected';

export const STATES: readonly [
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'loading',
  'error',
  'selected'
];

export type BehaviorBackend = 'base-ui' | 'react-aria' | 'zag' | 'native';

export interface SourceHash {
  path: string;
  sha256: string;
  bytes?: number;
}

export interface ContractMetadata {
  runId: string;
  schemaVersion: 1;
  createdAt: string | null;
  sourceHashes: SourceHash[];
  confidence: ConfidenceLevel;
  reviewStatus: ReviewStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  sourceViewport?: {
    width: number;
    height: number;
  } | null;
  notes?: string;
}

export interface TokenEntry {
  value: string | number | Record<string, unknown>;
  ref?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface TokenArchitecture {
  primitive: Record<string, TokenEntry | string | number | Record<string, unknown>>;
  semantic: Record<string, TokenEntry | string | number | Record<string, unknown>>;
  component: Record<string, TokenEntry | string | number | Record<string, unknown>>;
  themes?: Record<string, unknown>;
}

export interface AssetManifestEntry {
  id: string;
  path: string;
  kind?: 'svg' | 'raster' | 'icon' | 'image' | 'font' | 'other' | string;
  dimensions?: {
    width: number;
    height: number;
  } | null;
  license: string | null;
  sha256?: string;
  evidence?: string;
}

export interface ViewHierarchyRegions {
  layout?: string;
  navigation?: string[];
  content?: string;
  sidebar?: string[];
  modalOverlayRoot?: string;
  [key: string]: unknown;
}

export interface ViewHierarchyTreeNode {
  id: string;
  role?: string;
  children?: string[];
  [key: string]: unknown;
}

export interface ViewHierarchy {
  root: string;
  regions?: ViewHierarchyRegions;
  tree?: ViewHierarchyTreeNode[];
  [key: string]: unknown;
}

export interface PropSpecification {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
  [key: string]: unknown;
}

export interface EventSpecification {
  name: string;
  type?: string;
  payload?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ApplicableState<T = unknown> {
  applicable: true;
  value: T;
}

export interface NonApplicableState {
  applicable: false;
  reason: string;
}

export type StateDefinition<T = unknown> = ApplicableState<T> | NonApplicableState;

export type StateMatrix = Record<CanonicalState, StateDefinition> & { success?: StateDefinition };

export interface KeyboardRule {
  key: string;
  action: string;
  description?: string;
}

export interface KeyboardContract {
  rules?: KeyboardRule[];
  focusManagement?: string;
  [key: string]: unknown;
}

export interface AccessibilityContract {
  role?: string;
  ariaAttributes?: Record<string, string>;
  labelStrategy?: string;
  liveRegion?: string;
  [key: string]: unknown;
}

export interface ComponentAnatomy {
  root: string;
  slots?: Record<string, string>;
  parts?: string[];
  [key: string]: unknown;
}

export interface ComponentDefinition {
  stableId: string;
  id?: string;
  name?: string;
  description?: string;
  anatomy: ComponentAnatomy;
  props: PropSpecification[] | Record<string, PropSpecification>;
  events: EventSpecification[] | Record<string, EventSpecification>;
  backend: BehaviorBackend;
  states: StateMatrix;
  keyboard?: KeyboardContract;
  accessibility?: AccessibilityContract;
  [key: string]: unknown;
}

export interface ThemeContract {
  light: Record<string, unknown>;
  dark: Record<string, unknown>;
  highContrast?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RtlContract {
  supported: boolean;
  direction?: 'ltr' | 'rtl' | 'auto';
  logicalProperties?: boolean;
}

export interface ReducedMotionContract {
  supported: boolean;
  fallback?: string;
  behavior?: string;
}

export interface ResponsiveContract {
  breakpoints: Record<string, string | number>;
  containerQueries?: boolean | null;
  rules?: unknown[];
  [key: string]: unknown;
}

export interface UnknownEntry {
  id: string;
  category?: string;
  description: string;
  required: boolean;
  resolved: boolean;
  resolution?: string | null;
  evidence?: string;
}

export interface SourceEvidenceRef {
  id?: string;
  path: string;
  sha256?: string;
  confidence: ConfidenceLevel;
  description?: string;
  [key: string]: unknown;
}

export interface UnmappedEntry {
  path?: string;
  reason: string;
  [key: string]: unknown;
}

export interface DesignContract {
  schemaVersion: 1;
  metadata: ContractMetadata;
  tokens: TokenArchitecture;
  assets: AssetManifestEntry[];
  hierarchy: ViewHierarchy;
  components: ComponentDefinition[];
  themes?: ThemeContract | null;
  rtl?: RtlContract | null;
  reducedMotion?: ReducedMotionContract | null;
  responsive?: ResponsiveContract | null;
  unknowns: UnknownEntry[];
  evidence: Record<string, SourceEvidenceRef> | SourceEvidenceRef[];
  unmappedArtifacts?: UnmappedEntry[];
}

export interface IngestionReceiptFile {
  path: string;
  sha256: string;
  bytes: number;
  kind: 'html' | 'css' | 'json' | 'svg' | 'image' | 'component';
  evidence: Record<string, unknown>;
}

export interface IngestionReceipt {
  runId: string;
  createdAt?: string;
  workspace: string;
  receipt?: string;
  files: IngestionReceiptFile[];
  state?: 'INGESTED';
  sourceArchive?: { path: 'source-archive.zip'; sha256: string; bytes: number };
}

export interface ValidationOptions {
  receipt?: IngestionReceipt;
}

export interface ValidationResult {
  structuralValid: boolean;
  ready: boolean;
  errors: string[];
  unknowns: UnknownEntry[];
}

export interface DiffEntry {
  type: string;
  target?: string;
  component?: string;
  message: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ContractDiffSummary {
  isBreaking: boolean;
  breakingCount: number;
  additiveCount: number;
  visualCount: number;
  totalChanges: number;
}

export interface ContractDiff {
  compatible: boolean;
  breaking: DiffEntry[];
  additive: DiffEntry[];
  visual: DiffEntry[];
  summary: ContractDiffSummary;
}

/**
 * Extracts an honest, source-linked draft DesignContract from an ingestion receipt.
 * Unknown facts (dimensions, viewport, themes, rtl, reducedMotion, responsive) are represented
 * as explicit null values rather than invented defaults.
 * Writes output with exclusive 'wx' flag to prevent arbitrary overwriting.
 */
export function extractContract(
  receipt: IngestionReceipt,
  outputPath?: string
): Promise<DesignContract>;

/**
 * Validates a contract against structural schema invariants and optional receipt evidence.
 * Structural validity is separate from readiness: drafts pass structural validation, but readiness
 * strictly requires approved reviewStatus, non-empty approvedBy/approvedAt, at least one complete
 * reviewed component, explicit non-null reviewed rtl/reducedMotion/responsive, non-empty resolution
 * strings on all resolved required unknowns, and full parity against receipt source evidence.
 */
export function validateContract(
  contract: unknown,
  options?: ValidationOptions
): ValidationResult;

/**
 * Compares two approved contracts, classifying differences into breaking,
 * additive, and visual changes without executing code or calling models.
 */
export function diffContracts(
  oldContract: DesignContract,
  newContract: DesignContract
): ContractDiff;
