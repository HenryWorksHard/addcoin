import type React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      marquee: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          scrollamount?: number | string;
          scrolldelay?: number | string;
          direction?: string;
          behavior?: string;
          loop?: number | string;
        },
        HTMLElement
      >;
    }
  }
}
