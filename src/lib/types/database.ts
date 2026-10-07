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
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          org_id: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          notes: string | null
          org_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          gross_revenue: number
          id: string
          net_to_owner: number
          org_id: string
          period_end: string
          period_start: string
          property_id: string
          reconciled_at: string | null
          status: Database["public"]["Enums"]["reconciliation_status"]
          total_expenses: number
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_revenue?: number
          id?: string
          net_to_owner?: number
          org_id: string
          period_end: string
          period_start: string
          property_id: string
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          total_expenses?: number
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_revenue?: number
          id?: string
          net_to_owner?: number
          org_id?: string
          period_end?: string
          period_start?: string
          property_id?: string
          reconciled_at?: string | null
          status?: Database["public"]["Enums"]["reconciliation_status"]
          total_expenses?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          credit_note_no: string
          id: string
          invoice_id: string | null
          issued_at: string
          org_id: string
          reason: string | null
        }
        Insert: {
          amount: number
          credit_note_no: string
          id?: string
          invoice_id?: string | null
          issued_at?: string
          org_id: string
          reason?: string | null
        }
        Update: {
          amount?: number
          credit_note_no?: string
          id?: string
          invoice_id?: string | null
          issued_at?: string
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          contract_url: string | null
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          org_id: string
          phone: string | null
          salary: number
          status: Database["public"]["Enums"]["employee_status"]
          termination_date: string | null
          termination_reason: string | null
        }
        Insert: {
          contract_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          org_id: string
          phone?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
        }
        Update: {
          contract_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          org_id?: string
          phone?: string | null
          salary?: number
          status?: Database["public"]["Enums"]["employee_status"]
          termination_date?: string | null
          termination_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          org_id: string
          purchase_date: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          purchase_date?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          purchase_date?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          org_id: string
          property_id: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          org_id: string
          property_id?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          org_id?: string
          property_id?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_type: Database["public"]["Enums"]["invoice_item_type"]
          org_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_type?: Database["public"]["Enums"]["invoice_item_type"]
          org_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_type?: Database["public"]["Enums"]["invoice_item_type"]
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          last_reminder_sent_at: string | null
          lease_id: string
          org_id: string
          penalty_applied: boolean
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          last_reminder_sent_at?: string | null
          lease_id: string
          org_id: string
          penalty_applied?: boolean
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          last_reminder_sent_at?: string | null
          lease_id?: string
          org_id?: string
          penalty_applied?: boolean
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          memo: string | null
          org_id: string
          source_id: string | null
          source_type: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          memo?: string | null
          org_id: string
          source_id?: string | null
          source_type: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          memo?: string | null
          org_id?: string
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          org_id: string
          property_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          org_id: string
          property_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          org_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_termination_items: {
        Row: {
          category: string
          cost: number
          description: string
          id: string
          org_id: string
          termination_id: string
        }
        Insert: {
          category: string
          cost?: number
          description: string
          id?: string
          org_id: string
          termination_id: string
        }
        Update: {
          category?: string
          cost?: number
          description?: string
          id?: string
          org_id?: string
          termination_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_termination_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_termination_items_termination_id_fkey"
            columns: ["termination_id"]
            isOneToOne: false
            referencedRelation: "lease_terminations"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_terminations: {
        Row: {
          arrears: number
          created_at: string
          deposit_amount: number
          electricity_deduction: number
          id: string
          lease_id: string
          notes: string | null
          org_id: string
          refund_amount: number
          refunded: boolean
          refunded_at: string | null
          sent_at: string | null
          termination_date: string
          total_deductions: number
          water_deduction: number
        }
        Insert: {
          arrears?: number
          created_at?: string
          deposit_amount?: number
          electricity_deduction?: number
          id?: string
          lease_id: string
          notes?: string | null
          org_id: string
          refund_amount?: number
          refunded?: boolean
          refunded_at?: string | null
          sent_at?: string | null
          termination_date?: string
          total_deductions?: number
          water_deduction?: number
        }
        Update: {
          arrears?: number
          created_at?: string
          deposit_amount?: number
          electricity_deduction?: number
          id?: string
          lease_id?: string
          notes?: string | null
          org_id?: string
          refund_amount?: number
          refunded?: boolean
          refunded_at?: string | null
          sent_at?: string | null
          termination_date?: string
          total_deductions?: number
          water_deduction?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_terminations_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: true
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_terminations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          billing_day: number
          contract_url: string | null
          created_at: string
          deposit_amount: number
          end_date: string | null
          id: string
          org_id: string
          rent_amount: number
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          unit_id: string
        }
        Insert: {
          billing_day?: number
          contract_url?: string | null
          created_at?: string
          deposit_amount?: number
          end_date?: string | null
          id?: string
          org_id: string
          rent_amount: number
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          unit_id: string
        }
        Update: {
          billing_day?: number
          contract_url?: string | null
          created_at?: string
          deposit_amount?: number
          end_date?: string | null
          id?: string
          org_id?: string
          rent_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          billed: boolean
          billed_to: Database["public"]["Enums"]["maintenance_bill_target"]
          cost: number
          created_at: string
          description: string
          expense_id: string | null
          id: string
          issue_type: Database["public"]["Enums"]["maintenance_issue_type"]
          lease_id: string | null
          notes: string | null
          org_id: string
          reported_date: string
          resolved_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          unit_id: string
        }
        Insert: {
          billed?: boolean
          billed_to?: Database["public"]["Enums"]["maintenance_bill_target"]
          cost?: number
          created_at?: string
          description: string
          expense_id?: string | null
          id?: string
          issue_type?: Database["public"]["Enums"]["maintenance_issue_type"]
          lease_id?: string | null
          notes?: string | null
          org_id: string
          reported_date?: string
          resolved_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          unit_id: string
        }
        Update: {
          billed?: boolean
          billed_to?: Database["public"]["Enums"]["maintenance_bill_target"]
          cost?: number
          created_at?: string
          description?: string
          expense_id?: string | null
          id?: string
          issue_type?: Database["public"]["Enums"]["maintenance_issue_type"]
          lease_id?: string | null
          notes?: string | null
          org_id?: string
          reported_date?: string
          resolved_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          org_id: string
          template_type: Database["public"]["Enums"]["template_type"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          template_type?: Database["public"]["Enums"]["template_type"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          template_type?: Database["public"]["Enums"]["template_type"]
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_log: {
        Row: {
          batch_id: string | null
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          id: string
          org_id: string
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
          tenant_id: string | null
        }
        Insert: {
          batch_id?: string | null
          body: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          org_id: string
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          batch_id?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          org_id?: string
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_readings: {
        Row: {
          billed: boolean
          created_at: string
          current_reading: number
          id: string
          lease_id: string | null
          meter_type: Database["public"]["Enums"]["meter_type"]
          org_id: string
          previous_reading: number
          rate_per_unit: number
          reading_date: string
          unit_id: string
        }
        Insert: {
          billed?: boolean
          created_at?: string
          current_reading: number
          id?: string
          lease_id?: string | null
          meter_type: Database["public"]["Enums"]["meter_type"]
          org_id: string
          previous_reading?: number
          rate_per_unit?: number
          reading_date?: string
          unit_id: string
        }
        Update: {
          billed?: boolean
          created_at?: string
          current_reading?: number
          id?: string
          lease_id?: string | null
          meter_type?: Database["public"]["Enums"]["meter_type"]
          org_id?: string
          previous_reading?: number
          rate_per_unit?: number
          reading_date?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          phone: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          default_commission_rate: number
          id: string
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          owner_kra_pin: string | null
          owner_national_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          default_commission_rate?: number
          id?: string
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_kra_pin?: string | null
          owner_national_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          default_commission_rate?: number
          id?: string
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          owner_kra_pin?: string | null
          owner_national_id?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          org_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          org_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          org_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateways_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          org_id: string
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          org_id: string
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          org_id?: string
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          deductions: number
          employee_id: string
          gross_amount: number
          id: string
          net_amount: number
          org_id: string
          payroll_run_id: string
        }
        Insert: {
          deductions?: number
          employee_id: string
          gross_amount?: number
          id?: string
          net_amount?: number
          org_id: string
          payroll_run_id: string
        }
        Update: {
          deductions?: number
          employee_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          org_id?: string
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          org_id: string
          period_end: string
          period_start: string
          processed_at: string | null
          status: Database["public"]["Enums"]["payroll_status"]
          total_net: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          org_id: string
          period_end: string
          period_start: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_net?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          org_id?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          total_net?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "org_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_rules: {
        Row: {
          created_at: string
          grace_period_days: number
          id: string
          org_id: string
          penalty_kind: Database["public"]["Enums"]["penalty_kind"]
          penalty_value: number
          property_id: string | null
        }
        Insert: {
          created_at?: string
          grace_period_days?: number
          id?: string
          org_id: string
          penalty_kind?: Database["public"]["Enums"]["penalty_kind"]
          penalty_value?: number
          property_id?: string | null
        }
        Update: {
          created_at?: string
          grace_period_days?: number
          id?: string
          org_id?: string
          penalty_kind?: Database["public"]["Enums"]["penalty_kind"]
          penalty_value?: number
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penalty_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          city: string | null
          client_id: string | null
          commission_rate: number | null
          created_at: string
          id: string
          name: string
          org_id: string
          property_type: Database["public"]["Enums"]["property_type"]
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          name: string
          org_id: string
          property_type?: Database["public"]["Enums"]["property_type"]
        }
        Update: {
          address?: string | null
          city?: string | null
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_blocks: {
        Row: {
          created_at: string
          floor_count: number
          id: string
          name: string
          org_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          floor_count: number
          id?: string
          name: string
          org_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          floor_count?: number
          id?: string
          name?: string
          org_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_blocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_blocks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          amount: number
          description: string
          id: string
          org_id: string
          quote_id: string
        }
        Insert: {
          amount: number
          description: string
          id?: string
          org_id: string
          quote_id: string
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          org_id?: string
          quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          org_id: string
          property_id: string | null
          property_label: string | null
          quote_no: string
          status: Database["public"]["Enums"]["quote_status"]
          total_amount: number
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          org_id: string
          property_id?: string | null
          property_label?: string | null
          quote_no: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_amount?: number
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          org_id?: string
          property_id?: string | null
          property_label?: string | null
          quote_no?: string
          status?: Database["public"]["Enums"]["quote_status"]
          total_amount?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          org_id: string
          payment_id: string
          receipt_no: string
          sent_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          org_id: string
          payment_id: string
          receipt_no: string
          sent_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          org_id?: string
          payment_id?: string
          receipt_no?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_rules: {
        Row: {
          created_at: string
          id: string
          org_id: string
          property_id: string | null
          repeat_every_days: number
          trigger_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          property_id?: string | null
          repeat_every_days?: number
          trigger_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          property_id?: string | null
          repeat_every_days?: number
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_gateway_settings: {
        Row: {
          api_key: string | null
          api_secret: string | null
          is_active: boolean
          org_id: string
          provider: Database["public"]["Enums"]["sms_provider"]
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          is_active?: boolean
          org_id: string
          provider?: Database["public"]["Enums"]["sms_provider"]
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          is_active?: boolean
          org_id?: string
          provider?: Database["public"]["Enums"]["sms_provider"]
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_gateway_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stationery_items: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          quantity_on_hand: number
          reorder_level: number
          unit: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          quantity_on_hand?: number
          reorder_level?: number
          unit?: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          quantity_on_hand?: number
          reorder_level?: number
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stationery_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stationery_transactions: {
        Row: {
          created_at: string
          expense_id: string | null
          id: string
          item_id: string
          notes: string | null
          org_id: string
          quantity: number
          txn_date: string
          txn_type: Database["public"]["Enums"]["stationery_txn_type"]
        }
        Insert: {
          created_at?: string
          expense_id?: string | null
          id?: string
          item_id: string
          notes?: string | null
          org_id: string
          quantity: number
          txn_date?: string
          txn_type: Database["public"]["Enums"]["stationery_txn_type"]
        }
        Update: {
          created_at?: string
          expense_id?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          org_id?: string
          quantity?: number
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["stationery_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stationery_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stationery_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stationery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stationery_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          id_number: string | null
          org_id: string
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          org_id: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          org_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bedrooms: number | null
          block_id: string | null
          created_at: string
          floor: number | null
          id: string
          org_id: string
          property_id: string
          rent_amount: number
          status: Database["public"]["Enums"]["unit_status"]
          unit_no: string
          unit_type: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          bedrooms?: number | null
          block_id?: string | null
          created_at?: string
          floor?: number | null
          id?: string
          org_id: string
          property_id: string
          rent_amount?: number
          status?: Database["public"]["Enums"]["unit_status"]
          unit_no: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          bedrooms?: number | null
          block_id?: string | null
          created_at?: string
          floor?: number | null
          id?: string
          org_id?: string
          property_id?: string
          rent_amount?: number
          status?: Database["public"]["Enums"]["unit_status"]
          unit_no?: string
          unit_type?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "units_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "property_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_gateway_settings: {
        Row: {
          access_token: string | null
          business_account_id: string | null
          is_active: boolean
          org_id: string
          phone_number_id: string | null
          provider: Database["public"]["Enums"]["whatsapp_provider"]
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          business_account_id?: string | null
          is_active?: boolean
          org_id: string
          phone_number_id?: string | null
          provider?: Database["public"]["Enums"]["whatsapp_provider"]
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          business_account_id?: string | null
          is_active?: boolean
          org_id?: string
          phone_number_id?: string | null
          provider?: Database["public"]["Enums"]["whatsapp_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_gateway_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization:
        | {
            Args: {
              org_kind: Database["public"]["Enums"]["org_type"]
              org_name: string
            }
            Returns: string
          }
        | {
            Args: {
              org_kind: Database["public"]["Enums"]["org_type"]
              org_name: string
              p_owner_kra_pin?: string
              p_owner_national_id?: string
            }
            Returns: string
          }
      has_org_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["member_role"][]
          target_org_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
      post_commission_reconciliation_entry: {
        Args: {
          p_ledger: Database["public"]["Tables"]["commission_ledger"]["Row"]
        }
        Returns: undefined
      }
      post_deposit_entry: {
        Args: { p_lease: Database["public"]["Tables"]["leases"]["Row"] }
        Returns: undefined
      }
      post_deposit_settlement_entry: {
        Args: {
          p_termination: Database["public"]["Tables"]["lease_terminations"]["Row"]
        }
        Returns: undefined
      }
      post_expense_entry: {
        Args: { p_expense: Database["public"]["Tables"]["expenses"]["Row"] }
        Returns: undefined
      }
      post_journal_entry: {
        Args: {
          p_entry_date: string
          p_lines: Json
          p_memo: string
          p_org_id: string
          p_source_id: string
          p_source_type: string
        }
        Returns: string
      }
      post_payment_entry: {
        Args: { p_payment: Database["public"]["Tables"]["payments"]["Row"] }
        Returns: undefined
      }
      post_payroll_entry: {
        Args: { p_run: Database["public"]["Tables"]["payroll_runs"]["Row"] }
        Returns: undefined
      }
      reverse_latest_entry: {
        Args: { p_memo: string; p_source_id: string; p_source_type: string }
        Returns: undefined
      }
      seed_default_accounts: {
        Args: {
          p_org_id: string
          p_org_type: Database["public"]["Enums"]["org_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      employee_status: "active" | "inactive" | "terminated"
      equipment_status: "in_use" | "in_storage" | "maintenance" | "disposed"
      invoice_item_type: "rent" | "utility" | "penalty" | "other"
      invoice_status: "draft" | "sent" | "partial" | "paid" | "overdue" | "void"
      lease_status: "active" | "ended" | "terminated"
      maintenance_bill_target: "tenant" | "landlord" | "expense"
      maintenance_issue_type:
        | "plumbing"
        | "electrical"
        | "structural"
        | "appliance"
        | "painting"
        | "pest_control"
        | "other"
      maintenance_status: "open" | "resolved"
      member_role: "owner" | "admin" | "manager" | "accountant" | "staff"
      message_channel: "sms" | "email" | "whatsapp"
      message_status: "queued" | "sent" | "failed"
      meter_type: "water" | "electricity" | "gas" | "garbage"
      org_type: "manager" | "owner_direct"
      payment_method: "mpesa" | "bank" | "cash" | "card" | "other"
      payment_provider:
        | "bank_account"
        | "mpesa_paybill"
        | "mpesa_till"
        | "kopokopo"
        | "paypal"
        | "pesapal"
        | "paystack"
      payroll_status: "draft" | "approved" | "processed"
      penalty_kind: "flat" | "percentage"
      property_type: "residential" | "commercial" | "mixed_use"
      quote_status: "draft" | "sent" | "accepted" | "declined" | "expired"
      reconciliation_status: "pending" | "reconciled"
      sms_provider: "console" | "africastalking" | "twilio" | "custom"
      stationery_txn_type: "in" | "out"
      template_type:
        | "rent_due"
        | "partial_reminder"
        | "penalty"
        | "notice"
        | "receipt"
        | "custom"
        | "invoice_issued"
      unit_status: "vacant" | "occupied" | "maintenance"
      unit_type:
        | "single_room"
        | "double_room"
        | "bedsitter"
        | "one_bedroom"
        | "two_bedroom"
        | "three_bedroom"
        | "four_bedroom_plus"
        | "studio"
        | "other"
      whatsapp_provider:
        | "console"
        | "whatsapp_cloud_api"
        | "twilio_whatsapp"
        | "custom"
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
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      employee_status: ["active", "inactive", "terminated"],
      equipment_status: ["in_use", "in_storage", "maintenance", "disposed"],
      invoice_item_type: ["rent", "utility", "penalty", "other"],
      invoice_status: ["draft", "sent", "partial", "paid", "overdue", "void"],
      lease_status: ["active", "ended", "terminated"],
      maintenance_bill_target: ["tenant", "landlord", "expense"],
      maintenance_issue_type: [
        "plumbing",
        "electrical",
        "structural",
        "appliance",
        "painting",
        "pest_control",
        "other",
      ],
      maintenance_status: ["open", "resolved"],
      member_role: ["owner", "admin", "manager", "accountant", "staff"],
      message_channel: ["sms", "email", "whatsapp"],
      message_status: ["queued", "sent", "failed"],
      meter_type: ["water", "electricity", "gas", "garbage"],
      org_type: ["manager", "owner_direct"],
      payment_method: ["mpesa", "bank", "cash", "card", "other"],
      payment_provider: [
        "bank_account",
        "mpesa_paybill",
        "mpesa_till",
        "kopokopo",
        "paypal",
        "pesapal",
        "paystack",
      ],
      payroll_status: ["draft", "approved", "processed"],
      penalty_kind: ["flat", "percentage"],
      property_type: ["residential", "commercial", "mixed_use"],
      quote_status: ["draft", "sent", "accepted", "declined", "expired"],
      reconciliation_status: ["pending", "reconciled"],
      sms_provider: ["console", "africastalking", "twilio", "custom"],
      stationery_txn_type: ["in", "out"],
      template_type: [
        "rent_due",
        "partial_reminder",
        "penalty",
        "notice",
        "receipt",
        "custom",
        "invoice_issued",
      ],
      unit_status: ["vacant", "occupied", "maintenance"],
      unit_type: [
        "single_room",
        "double_room",
        "bedsitter",
        "one_bedroom",
        "two_bedroom",
        "three_bedroom",
        "four_bedroom_plus",
        "studio",
        "other",
      ],
      whatsapp_provider: [
        "console",
        "whatsapp_cloud_api",
        "twilio_whatsapp",
        "custom",
      ],
    },
  },
} as const
