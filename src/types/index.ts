export type EntityType = 'contact' | 'deal' | 'note' | 'task';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  source: string;
  status: string;
  category?: string;
  country?: string;
  city?: string;
  notes?: string;
  last_contacted_at?: string;
  next_follow_up_at?: string;
  deal_value?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  contact_id?: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  folder: string;
  pinned: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  linked_contact_id?: string;
  linked_deal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
}
