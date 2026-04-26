export type EntityType = 'contact' | 'deal' | 'note' | 'task';

export interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  source: string;
  status: string;
  category?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  next_follow_up_at?: string | null;
  deal_value?: number | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  contact_id?: string | null;
  title: string;
  value: number | null;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  folder: string;
  pinned: boolean;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  linked_contact_id?: string | null;
  linked_deal_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}
