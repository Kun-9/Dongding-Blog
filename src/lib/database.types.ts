export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          date: string
          id: number
          note: string
          source: string
          tag: string
          title: string
          url: string
        }
        Insert: {
          date: string
          id?: never
          note?: string
          source?: string
          tag?: string
          title: string
          url: string
        }
        Update: {
          date?: string
          id?: never
          note?: string
          source?: string
          tag?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          description: string
          id: string
          name: string
          parent_id: string | null
          sort: number
        }
        Insert: {
          description?: string
          id: string
          name: string
          parent_id?: string | null
          sort?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      link_meta: {
        Row: {
          description: string | null
          fetched_at: string
          icon: string | null
          image: string | null
          title: string | null
          url: string
        }
        Insert: {
          description?: string | null
          fetched_at?: string
          icon?: string | null
          image?: string | null
          title?: string | null
          url: string
        }
        Update: {
          description?: string | null
          fetched_at?: string
          icon?: string | null
          image?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      oauth_code: {
        Row: {
          expires_at: string
          jti: string
        }
        Insert: {
          expires_at: string
          jti: string
        }
        Update: {
          expires_at?: string
          jti?: string
        }
        Relationships: []
      }
      post_revisions: {
        Row: {
          body: string
          category_id: string | null
          created_at: string
          date: string | null
          id: number
          post_id: string
          series_id: string | null
          series_order: number | null
          slug: string
          summary: string
          tags: string[]
          title: string
          visibility: string | null
        }
        Insert: {
          body?: string
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: never
          post_id: string
          series_id?: string | null
          series_order?: number | null
          slug: string
          summary?: string
          tags?: string[]
          title: string
          visibility?: string | null
        }
        Update: {
          body?: string
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: never
          post_id?: string
          series_id?: string | null
          series_order?: number | null
          slug?: string
          summary?: string
          tags?: string[]
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_stats: {
        Row: {
          likes: number
          post_id: string
          updated_at: string
          views: number
        }
        Insert: {
          likes?: number
          post_id: string
          updated_at?: string
          views?: number
        }
        Update: {
          likes?: number
          post_id?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_stats_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body: string
          category_id: string
          created_at: string
          date: string
          featured: boolean
          id: string
          read_time: number | null
          series_id: string | null
          series_order: number | null
          slug: string
          summary: string
          tags: string[]
          thumbnail: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          category_id: string
          created_at?: string
          date: string
          featured?: boolean
          id?: string
          read_time?: number | null
          series_id?: string | null
          series_order?: number | null
          slug: string
          summary?: string
          tags?: string[]
          thumbnail?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          date?: string
          featured?: boolean
          id?: string
          read_time?: number | null
          series_id?: string | null
          series_order?: number | null
          slug?: string
          summary?: string
          tags?: string[]
          thumbnail?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      release_candidates: {
        Row: {
          body: string
          collected_at: string
          id: string
          name: string | null
          note: string | null
          published_at: string
          repo: string
          status: string
          tag: string
          url: string
        }
        Insert: {
          body: string
          collected_at?: string
          id: string
          name?: string | null
          note?: string | null
          published_at: string
          repo: string
          status?: string
          tag: string
          url: string
        }
        Update: {
          body?: string
          collected_at?: string
          id?: string
          name?: string | null
          note?: string | null
          published_at?: string
          repo?: string
          status?: string
          tag?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_candidates_repo_fkey"
            columns: ["repo"]
            isOneToOne: false
            referencedRelation: "release_sources"
            referencedColumns: ["repo"]
          },
        ]
      }
      release_config: {
        Row: {
          collect_enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          collect_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          collect_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      release_sources: {
        Row: {
          created_at: string
          enabled: boolean
          repo: string
          sort: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          repo: string
          sort?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          repo?: string
          sort?: number
        }
        Relationships: []
      }
      release_topic_candidates: {
        Row: {
          candidate_id: string
          topic_id: number
        }
        Insert: {
          candidate_id: string
          topic_id: number
        }
        Update: {
          candidate_id?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "release_topic_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "release_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_topic_candidates_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "release_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      release_topics: {
        Row: {
          angle: string | null
          checks: Json
          created_at: string
          dropped_reason: string | null
          id: number
          post_slug: string | null
          stage: string
          title: string
          updated_at: string
        }
        Insert: {
          angle?: string | null
          checks?: Json
          created_at?: string
          dropped_reason?: string | null
          id?: never
          post_slug?: string | null
          stage?: string
          title: string
          updated_at?: string
        }
        Update: {
          angle?: string | null
          checks?: Json
          created_at?: string
          dropped_reason?: string | null
          id?: never
          post_slug?: string | null
          stage?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          planned_count: number
          sort: number
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id: string
          planned_count?: number
          sort?: number
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          planned_count?: number
          sort?: number
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view: { Args: { p_slug: string }; Returns: undefined }
      toggle_like: {
        Args: { p_delta: number; p_slug: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
