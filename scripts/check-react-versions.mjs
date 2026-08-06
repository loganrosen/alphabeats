import { version as reactVersion } from "react";
import { version as reactDomVersion } from "react-dom";

if (reactVersion !== reactDomVersion) {
  console.error(
    `react ${reactVersion} does not match react-dom ${reactDomVersion}`,
  );
  process.exit(1);
}
