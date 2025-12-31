export interface Store {
  id: string
  user_id: string
  name: string
  shopify_domain: string
  shopify_client_id_encrypted: string | null
  shopify_client_secret_encrypted: string | null
  shopify_access_token_encrypted: string | null
  shopify_scopes: string[]
  courier_provider: string | null
  courier_credentials_encrypted: string | null
  invoice_provider: string | null
  invoice_credentials_encrypted: string | null
  webhook_secret: string | null
  auto_fulfill: boolean
  created_at: string
  updated_at: string
}

export interface StoreInsert {
  name: string
  shopify_domain: string
  shopify_client_id_encrypted?: string | null
  shopify_client_secret_encrypted?: string | null
  shopify_access_token_encrypted?: string | null
  shopify_scopes?: string[]
  courier_provider?: string | null
  courier_credentials_encrypted?: string | null
  invoice_provider?: string | null
  invoice_credentials_encrypted?: string | null
  webhook_secret?: string | null
  auto_fulfill?: boolean
}

export interface StoreUpdate {
  name?: string
  shopify_domain?: string
  shopify_client_id_encrypted?: string | null
  shopify_client_secret_encrypted?: string | null
  shopify_access_token_encrypted?: string | null
  shopify_scopes?: string[]
  courier_provider?: string | null
  courier_credentials_encrypted?: string | null
  invoice_provider?: string | null
  invoice_credentials_encrypted?: string | null
  webhook_secret?: string | null
  auto_fulfill?: boolean
  updated_at?: string
}

