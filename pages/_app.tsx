import type { ComponentType, ReactNode } from "react";

import "../src/styles.css";

interface AppProps {
  readonly Component: ComponentType<Record<string, unknown>>;
  readonly pageProps: Record<string, unknown>;
}

export default function App({ Component, pageProps }: AppProps): ReactNode {
  return <Component {...pageProps} />;
}
