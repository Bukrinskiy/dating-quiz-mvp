export type Role = "USER_SELF" | "USER_PEER";
export type SessionMode = "write_now" | "analyze_case";
export type AppAccessStatusLabel = "Inactive" | "Active" | "Promo";
export type AccessStatusCode =
  | "active"
  | "promo_active"
  | "grace_period"
  | "expired"
  | "revoked"
  | "token_issued"
  | string;

export type AccessStatus = {
  has_access: boolean;
  order_id?: string | null;
  plan?: string | null;
  access_status?: AccessStatusCode | null;
  status_label?: AppAccessStatusLabel | null;
  expires_at?: string | null;
};

export type AuthPayload = {
  user: {
    id: string;
    email: string;
    locale: string;
  };
  tokens: {
    access_token: string;
    expires_in: number;
  };
  access: AccessStatus;
};

export type AppAuthApi = {
  auth: AuthPayload | null;
  setAuth: (value: AuthPayload | null) => void;
  refreshAuth: () => Promise<AuthPayload | null>;
  logout: () => Promise<void>;
};

export type SessionAssetResponse = {
  session_id: string;
  asset_id: string;
  state: string;
  needs_confirmation: boolean;
  summary_for_user: string;
};

export type SessionBatchCloseResponse = {
  session_id: string;
  state: string;
  needs_confirmation: boolean;
  context_preview: string;
};

export type SessionDeleteAssetResponse = {
  session_id: string;
  asset_id: string;
  message_id?: string | null;
  deleted: boolean;
  remaining_items: number;
  state: string;
  context_preview: string;
  ui_payload?: SessionGeneratePayload | null;
};

export type SessionGeneratePayload = Record<string, unknown>;

export type SessionGenerateResponse = {
  session_id: string;
  mode: SessionMode;
  state: string;
  next_step: string;
  llm_provider: string;
  model_name: string;
  ui_payload: SessionGeneratePayload;
};

export type SessionRefineResponse = SessionGenerateResponse & {
  primary_message?: string;
  why?: string;
  fallback_simple_version?: string;
  alternatives?: string[];
};

export type SessionListItem = {
  session_id: string;
  mode: SessionMode;
  status: string;
  state: string;
  created_at: string;
  updated_at: string;
  preview: string;
};

export type SessionDetail = {
  session_id: string;
  mode: SessionMode;
  status: string;
  state: string;
  context_preview: string;
  messages: SessionMessage[];
  ui_payload: SessionGeneratePayload | null;
  editable: boolean;
  created_at: string;
  updated_at: string;
};

export type SessionStage = "collect" | "confirm" | "generate" | "result";

export type SessionMessage = {
  id: string;
  kind: "text" | "image" | "audio" | "system" | "assistant";
  role?: Role | null;
  authorLabel?: string | null;
  sentAt?: string | null;
  text: string;
  uiPayload?: SessionGeneratePayload | null;
  pending?: boolean;
};

export type RoleMeta = {
  role: Role;
  display_name: string;
  sent_at: string;
};

export type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone?: "default" | "error" | "warning" | "success";
  action?: ToastAction;
};

export type SupportResponse = {
  ok: boolean;
};
