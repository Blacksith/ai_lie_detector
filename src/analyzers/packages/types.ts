export interface PackageDep {
  name: string;
  range: string;
  section: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
}

export interface PackageMeta {
  latest: string;
  deprecated?: string;
  modifiedAt?: string;
}

export interface PackageCacheEntry {
  fetchedAt: number;
  meta: PackageMeta;
}

export interface PackageCache {
  packages: Record<string, PackageCacheEntry>;
}
