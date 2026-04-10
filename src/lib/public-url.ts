const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value: string | undefined, fallback: string) => {
  const candidate = value?.trim();
  if (!candidate) {
    return fallback;
  }

  if (candidate.startsWith("/")) {
    return trimTrailingSlash(candidate) || fallback;
  }

  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return trimTrailingSlash(new URL(withProtocol).toString());
  } catch {
    return fallback;
  }
};

export const buildPublicUrl = (
  pathname: string,
  options: {
    baseValue?: string;
    fallbackBase?: string;
  } = {},
) => {
  const fallbackBase = options.fallbackBase ?? "";
  const base = normalizeBaseUrl(options.baseValue, fallbackBase);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!base) {
    return normalizedPath;
  }

  if (base.startsWith("/")) {
    return `${base}${normalizedPath}`;
  }

  try {
    return new URL(normalizedPath, `${base}/`).toString();
  } catch {
    return normalizedPath;
  }
};
