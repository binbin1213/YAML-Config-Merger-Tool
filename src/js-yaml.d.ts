// Type definitions for js-yaml
declare const jsyaml: {
  load(content: string): any;
  dump(content: any, options?: {
    lineWidth?: number;
    noRefs?: boolean;
    quotingType?: string;
    sortKeys?: (a: string, b: string) => number;
  }): string;
};

export { jsyaml };
