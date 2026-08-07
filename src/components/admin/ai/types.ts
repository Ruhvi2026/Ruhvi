export interface AiComponentProps {
  providers: any[];
  setProviders: (p: any[]) => void;
  features: any;
  setFeatures: (f: any) => void;
  prompts: any;
  setPrompts: (p: any) => void;
  globalConfig: any;
  setGlobalConfig: (g: any) => void;
  logs: any[];
  saveSettings: () => void;
  isSaving: boolean;
  PREDEFINED_PROVIDERS: Record<string, any>;
}
