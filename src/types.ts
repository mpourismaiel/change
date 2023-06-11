export type ContextDataType = {
  [key: string | number]: string | number | boolean | ContextDataType;
};

export type ContextValueType = {
  value: string | number | boolean | ContextDataType;
  original: string | null;
  type: "variable" | "text";
};

export type Pointers = Record<
  string,
  {
    path: string;
    dependencies: string[];
    lookup: (context: ContextDataType) => ContextValueType;
  }
>;

export type Subscribers = Record<string, Array<(newValue: unknown) => void>>;
