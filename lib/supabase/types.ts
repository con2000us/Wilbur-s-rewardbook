// Database type definitions for Supabase
// This file provides TypeScript types for the database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_provider_configs: {
        Row: {
          id: string
          provider: string
          label: string | null
          encrypted_api_key: string
          key_version: string
          purpose: string
          endpoint_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider?: string
          label?: string | null
          encrypted_api_key: string
          key_version?: string
          purpose?: string
          endpoint_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          label?: string | null
          encrypted_api_key?: string
          key_version?: string
          purpose?: string
          endpoint_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          id: string
          name: string
          email: string | null
          avatar_url: string | null
          reward_config: Json | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          avatar_url?: string | null
          reward_config?: Json | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          avatar_url?: string | null
          reward_config?: Json | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          student_id: string
          name: string
          color: string
          icon: string
          order_index: number
          grade_mapping: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          name: string
          color?: string
          icon?: string
          order_index?: number
          grade_mapping?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          name?: string
          color?: string
          icon?: string
          order_index?: number
          grade_mapping?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          assessment_type: string | null
          score: number | null
          max_score: number
          percentage: number | null
          reward_amount: number
          penalty_amount: number
          status: string
          due_date: string | null
          completed_date: string | null
          notes: string | null
          grade: string | null
          score_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          title: string
          description?: string | null
          assessment_type?: string | null
          score?: number | null
          max_score?: number
          percentage?: number | null
          reward_amount?: number
          penalty_amount?: number
          status?: string
          due_date?: string | null
          completed_date?: string | null
          notes?: string | null
          grade?: string | null
          score_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          title?: string
          description?: string | null
          assessment_type?: string | null
          score?: number | null
          max_score?: number
          percentage?: number | null
          reward_amount?: number
          penalty_amount?: number
          status?: string
          due_date?: string | null
          completed_date?: string | null
          notes?: string | null
          grade?: string | null
          score_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_import_drafts: {
        Row: {
          id: string
          job_id: string
          student_id: string
          subject_id: string | null
          detected_subject_name: string | null
          subject_candidates: Json | null
          title: string | null
          assessment_type: string | null
          score: number | null
          max_score: number
          percentage: number | null
          assessment_date: string | null
          notes: string | null
          confidence: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          student_id: string
          subject_id?: string | null
          detected_subject_name?: string | null
          subject_candidates?: Json | null
          title?: string | null
          assessment_type?: string | null
          score?: number | null
          max_score?: number
          percentage?: number | null
          assessment_date?: string | null
          notes?: string | null
          confidence?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          student_id?: string
          subject_id?: string | null
          detected_subject_name?: string | null
          subject_candidates?: Json | null
          title?: string | null
          assessment_type?: string | null
          score?: number | null
          max_score?: number
          percentage?: number | null
          assessment_date?: string | null
          notes?: string | null
          confidence?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_import_jobs: {
        Row: {
          id: string
          student_id: string
          source_file_path: string | null
          source_file_mime: string | null
          source_file_size: number | null
          status: string
          raw_ocr_text: string | null
          ai_json: Json | null
          validated_json: Json | null
          provider: string | null
          model: string | null
          error_code: string | null
          error_message: string | null
          retry_count: number
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          source_file_path?: string | null
          source_file_mime?: string | null
          source_file_size?: number | null
          status?: string
          raw_ocr_text?: string | null
          ai_json?: Json | null
          validated_json?: Json | null
          provider?: string | null
          model?: string | null
          error_code?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          source_file_path?: string | null
          source_file_mime?: string | null
          source_file_size?: number | null
          status?: string
          raw_ocr_text?: string | null
          ai_json?: Json | null
          validated_json?: Json | null
          provider?: string | null
          model?: string | null
          error_code?: string | null
          error_message?: string | null
          retry_count?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      assessment_import_mistake_drafts: {
        Row: {
          id: string
          draft_id: string
          question_number: string | null
          student_answer: string | null
          correct_answer: string | null
          mistake_type: string | null
          knowledge_point: string | null
          ai_reason: string | null
          confidence: number | null
          raw_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          draft_id: string
          question_number?: string | null
          student_answer?: string | null
          correct_answer?: string | null
          mistake_type?: string | null
          knowledge_point?: string | null
          ai_reason?: string | null
          confidence?: number | null
          raw_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          draft_id?: string
          question_number?: string | null
          student_answer?: string | null
          correct_answer?: string | null
          mistake_type?: string | null
          knowledge_point?: string | null
          ai_reason?: string | null
          confidence?: number | null
          raw_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      assessment_mistakes: {
        Row: {
          id: string
          assessment_id: string
          question_number: string | null
          student_answer: string | null
          correct_answer: string | null
          mistake_type: string | null
          knowledge_point: string | null
          ai_reason: string | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          question_number?: string | null
          student_answer?: string | null
          correct_answer?: string | null
          mistake_type?: string | null
          knowledge_point?: string | null
          ai_reason?: string | null
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          question_number?: string | null
          student_answer?: string | null
          correct_answer?: string | null
          mistake_type?: string | null
          knowledge_point?: string | null
          ai_reason?: string | null
          confidence?: number | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          student_id: string
          assessment_id: string | null
          reward_type_id: string | null
          achievement_event_id: string | null
          transaction_type: string
          amount: number
          description: string | null
          category: string | null
          category_old: string | null
          transaction_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          assessment_id?: string | null
          reward_type_id?: string | null
          achievement_event_id?: string | null
          transaction_type: string
          amount: number
          description?: string | null
          category?: string | null
          category_old?: string | null
          transaction_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          assessment_id?: string | null
          reward_type_id?: string | null
          achievement_event_id?: string | null
          transaction_type?: string
          amount?: number
          description?: string | null
          category?: string | null
          category_old?: string | null
          transaction_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reward_rules: {
        Row: {
          id: string
          student_id: string | null
          subject_id: string | null
          rule_name: string
          description: string | null
          icon: string
          color: string
          min_score: number | null
          max_score: number | null
          reward_amount: number
          priority: number
          is_active: boolean
          condition: string | null
          assessment_type: string | null
          display_order: number
          reward_formula: string | null
          reward_config: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          subject_id?: string | null
          rule_name: string
          description?: string | null
          icon?: string
          color?: string
          min_score?: number | null
          max_score?: number | null
          reward_amount?: number
          priority?: number
          is_active?: boolean
          condition?: string | null
          assessment_type?: string | null
          display_order?: number
          reward_formula?: string | null
          reward_config?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          subject_id?: string | null
          rule_name?: string
          description?: string | null
          icon?: string
          color?: string
          min_score?: number | null
          max_score?: number | null
          reward_amount?: number
          priority?: number
          is_active?: boolean
          condition?: string | null
          assessment_type?: string | null
          display_order?: number
          reward_formula?: string | null
          reward_config?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      custom_reward_types: {
        Row: {
          id: string
          type_key: string
          display_name: string
          icon: string
          color: string | null
          default_unit: string | null
          is_accumulable: boolean | null
          display_order: number | null
          is_system: boolean | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          type_key: string
          display_name?: string
          icon?: string
          color?: string | null
          default_unit?: string | null
          is_accumulable?: boolean | null
          display_order?: number | null
          is_system?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          type_key?: string
          display_name?: string
          icon?: string
          color?: string | null
          default_unit?: string | null
          is_accumulable?: boolean | null
          display_order?: number | null
          is_system?: boolean | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_rules: {
        Row: {
          id: string
          rule_key: string
          name: string
          description: string | null
          required_reward_type_id: string | null
          required_amount: number
          reward_item: string | null
          reward_type_id: string | null
          reward_amount: number | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          rule_key?: string
          name: string
          description?: string | null
          required_reward_type_id?: string | null
          required_amount: number
          reward_item?: string | null
          reward_type_id?: string | null
          reward_amount?: number | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          rule_key?: string
          name?: string
          description?: string | null
          required_reward_type_id?: string | null
          required_amount?: number
          reward_item?: string | null
          reward_type_id?: string | null
          reward_amount?: number | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_rule_translations: {
        Row: {
          id: string
          rule_id: string
          locale: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          rule_id: string
          locale: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          rule_id?: string
          locale?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      achievement_events: {
        Row: {
          id: string
          event_key: string
          name: string
          description: string | null
          is_active: boolean
          display_order: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_key?: string
          name: string
          description?: string | null
          is_active?: boolean
          display_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_key?: string
          name?: string
          description?: string | null
          is_active?: boolean
          display_order?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      achievement_event_translations: {
        Row: {
          id: string
          event_id: string
          locale: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          locale: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          locale?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      achievement_event_reward_rules: {
        Row: {
          id: string
          event_id: string
          reward_type_id: string
          default_amount: number | null
          is_default: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          reward_type_id: string
          default_amount?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          reward_type_id?: string
          default_amount?: number | null
          is_default?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          id: string
          name: string
          description: string | null
          backup_data: Json
          file_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          backup_data: Json
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          backup_data?: Json
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      student_summary: {
        Row: {
          student_id: string
          name: string
          reward_config: Json | null
          total_subjects: number
          total_assessments: number
          completed_assessments: number
          total_earned: number
          total_spent: number
          balance: number
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}

