import React, { useEffect, useState } from 'react';
import { Key, FileText, Target, Clock, User, Eye, EyeOff, Save, Plus, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore, SettingsSection, OutreachTemplate } from '@/stores/settingsStore';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: 'api_keys', label: 'API Keys', icon: Key },
  { id: 'templates', label: 'Outreach Templates', icon: FileText },
  { id: 'niche', label: 'Niche Configuration', icon: Target },
  { id: 'follow_up', label: 'Follow-up Schedule', icon: Clock },
  { id: 'identity', label: 'Sender Identity', icon: User },
];

const API_KEY_FIELDS = [
  { key: 'apify_token', label: 'Apify API Token' },
  { key: 'companies_house_api_key', label: 'UK Companies House API Key' },
  { key: 'twilio_sid', label: 'Twilio Account SID' },
  { key: 'twilio_auth', label: 'Twilio Auth Token' },
  { key: 'twilio_whatsapp_from', label: 'Twilio WhatsApp From Number' },
  { key: 'brevo_api_key', label: 'Brevo API Key' },
  { key: 'resend_api_key', label: 'Resend API Key' },
  { key: 'openrouter_api_key', label: 'OpenRouter API Key (Claude)' },
];

export const SettingsApp = () => {
  const { activeSection, setActiveSection, fetchApiKeys, fetchTemplates } = useSettingsStore();

  useEffect(() => {
    fetchApiKeys();
    fetchTemplates();
  }, [fetchApiKeys, fetchTemplates]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gold/10 bg-bg-surface/30 p-4 flex flex-col gap-2">
        <h2 className="text-xl font-display text-gold mb-4 px-2">Settings</h2>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
              activeSection === section.id
                ? 'bg-gold/20 text-gold'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
            )}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-3xl mx-auto">
          {activeSection === 'api_keys' && <ApiKeysSection />}
          {activeSection === 'templates' && <TemplatesSection />}
          {activeSection === 'niche' && <PlaceholderSection title="Niche Configuration" />}
          {activeSection === 'follow_up' && <PlaceholderSection title="Follow-up Schedule" />}
          {activeSection === 'identity' && <PlaceholderSection title="Sender Identity" />}
        </div>
      </div>
    </div>
  );
};

const ApiKeysSection = () => {
  const { apiKeys, updateApiKey } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display text-white mb-2">API Keys & Integrations</h3>
        <p className="text-sm text-text-secondary">Configure your third-party service credentials. These are securely stored and prioritize over environment variables.</p>
      </div>

      <div className="space-y-4">
        {API_KEY_FIELDS.map((field) => (
          <ApiKeyField
            key={field.key}
            label={field.label}
            settingKey={field.key}
            initialValue={apiKeys[field.key] || ''}
            onSave={(val) => updateApiKey(field.key, val)}
          />
        ))}
      </div>
    </div>
  );
};

const ApiKeyField = ({ label, settingKey, initialValue, onSave }: { label: string, settingKey: string, initialValue: string, onSave: (val: string) => void }) => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-2">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setIsEditing(true);
            }}
            placeholder={`Enter ${label}...`}
            className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 font-mono"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {isEditing && (
          <button
            onClick={handleSave}
            className="bg-gold text-black px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gold/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        )}
      </div>
    </div>
  );
};

const TemplatesSection = () => {
  const { templates, createTemplate, deleteTemplate, updateTemplate } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-display text-white mb-2">Outreach Templates</h3>
          <p className="text-sm text-text-secondary">Manage message templates for AI generation and sending.</p>
        </div>
        <button 
          className="bg-gold text-black px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gold/90 transition-colors"
          onClick={() => {
            // Trigger new template creation UI here in a real implementation
            createTemplate({
              name: 'New Template',
              channel: 'email',
              niche: 'general',
              body_template: 'Hi {{contact_name}}, ...'
            });
          }}
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      <div className="grid gap-4">
        {templates.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} onDelete={() => deleteTemplate(tpl.id)} onUpdate={(updates) => updateTemplate(tpl.id, updates)} />
        ))}
        {templates.length === 0 && (
          <div className="text-center py-10 text-text-secondary">No templates found.</div>
        )}
      </div>
    </div>
  );
};

const TemplateCard = ({ template, onDelete, onUpdate }: { template: OutreachTemplate, onDelete: () => void, onUpdate: (u: Partial<OutreachTemplate>) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(template.body_template);

  if (isEditing) {
    return (
      <div className="bg-[#111] border border-gold/30 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gold">{template.name}</span>
        </div>
        <textarea 
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-32 bg-black border border-[#333] rounded-lg p-3 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 resize-none"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm hover:bg-white/10 rounded-lg">Cancel</button>
          <button 
            onClick={() => { onUpdate({ body_template: body }); setIsEditing(false); }}
            className="bg-gold text-black px-3 py-1.5 text-sm rounded-lg font-medium"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-white">{template.name}</span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            template.channel === 'whatsapp' ? 'bg-green-500/20 text-green-400' : 
            template.channel === 'email' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
          )}>
            {template.channel}
          </span>
          <span className="text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">{template.niche}</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsEditing(true)} className="text-xs text-text-secondary hover:text-white px-2 py-1">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 flex items-center"><Trash2 className="w-3 h-3 mr-1" /> Delete</button>
        </div>
      </div>
      <div className="bg-black/50 p-3 rounded-lg text-sm text-text-secondary font-mono line-clamp-2">
        {template.body_template}
      </div>
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span>Used: {template.times_used} times</span>
        <span>Replies: {template.reply_count}</span>
        <span>Rate: {template.reply_rate}%</span>
      </div>
    </div>
  );
};

const PlaceholderSection = ({ title }: { title: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
    <Settings className="w-12 h-12 mb-4 text-gold/50" />
    <h3 className="text-xl font-display text-white mb-2">{title}</h3>
    <p className="text-sm text-text-secondary max-w-md">This section is available in the full version of MAK OS Desktop v2.</p>
  </div>
);
