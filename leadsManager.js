const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const LEADS_FILE = path.join(__dirname, 'admin', 'data', 'leads.json');
const CAMPAIGNS_FILE = path.join(__dirname, 'admin', 'data', 'campaigns.json');

async function loadLeads() {
  try {
    const data = await fs.readFile(LEADS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveLeads(leads) {
  await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
}

async function loadCampaigns() {
  try {
    const data = await fs.readFile(CAMPAIGNS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveCampaigns(campaigns) {
  await fs.mkdir(path.dirname(CAMPAIGNS_FILE), { recursive: true });
  await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
}

function calculateLeadScore(lead) {
  let score = 0;
  const followers = lead.followers || 0;
  const following = lead.following || 0;
  const likes = lead.totalLikes || 0;
  const videos = lead.videos || 1;

  const engagementRate = videos > 0 ? (likes / videos) / Math.max(followers, 1) : 0;

  if (followers >= 100000) score += 40;
  else if (followers >= 50000) score += 35;
  else if (followers >= 10000) score += 30;
  else if (followers >= 5000) score += 20;
  else if (followers >= 1000) score += 10;
  else score += 5;

  const ratio = followers > 0 ? following / followers : 0;
  if (ratio < 0.5 && followers > 1000) score += 15;
  else if (ratio < 1) score += 10;
  else if (ratio < 2) score += 5;

  if (engagementRate > 0.1) score += 20;
  else if (engagementRate > 0.05) score += 15;
  else if (engagementRate > 0.02) score += 10;
  else score += 5;

  if (lead.isVerified) score += 10;
  if (!lead.isPrivate) score += 5;
  if (lead.bio && lead.bio.length > 0) score += 5;

  if (lead.status === 'converted') score += 20;
  else if (lead.status === 'contacted') score += 10;

  return Math.min(100, score);
}

async function addLead(leadData) {
  const leads = await loadLeads();
  const existing = leads.find(l =>
    l.platform === leadData.platform && l.platformId === leadData.platformId
  );
  if (existing) {
    Object.assign(existing, leadData, {
      interactions: [
        ...(existing.interactions || []),
        ...(leadData.interactions || []),
      ],
      lastInteractionAt: new Date().toISOString(),
    });
    existing.leadScore = calculateLeadScore(existing);
    await saveLeads(leads);
    return existing;
  }

  const lead = {
    id: uuidv4(),
    platform: leadData.platform || 'tiktok',
    platformId: leadData.platformId || '',
    username: leadData.username || '',
    profileUrl: leadData.profileUrl || '',
    avatarUrl: leadData.avatarUrl || '',
    bio: leadData.bio || '',
    followers: leadData.followers || 0,
    following: leadData.following || 0,
    totalLikes: leadData.totalLikes || 0,
    videos: leadData.videos || 0,
    isPrivate: leadData.isPrivate || false,
    isVerified: leadData.isVerified || false,
    email: leadData.email || '',
    sourceVideo: leadData.sourceVideo || '',
    sourceKeyword: leadData.sourceKeyword || '',
    campaignId: leadData.campaignId || '',
    status: leadData.status || 'new',
    tags: leadData.tags || [],
    notes: leadData.notes || '',
    interactions: leadData.interactions || [
      { type: 'discovered', timestamp: new Date().toISOString(), content: `Found via ${leadData.sourceKeyword || 'search'}` },
    ],
    discoveredAt: new Date().toISOString(),
    lastInteractionAt: new Date().toISOString(),
  };
  lead.leadScore = calculateLeadScore(lead);
  leads.push(lead);
  await saveLeads(leads);
  return lead;
}

async function updateLead(id, updates) {
  const leads = await loadLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  Object.assign(leads[idx], updates);
  if (updates.followers !== undefined || updates.status) {
    leads[idx].leadScore = calculateLeadScore(leads[idx]);
  }
  await saveLeads(leads);
  return leads[idx];
}

async function addInteraction(leadId, interaction) {
  const leads = await loadLeads();
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return null;
  lead.interactions.push({ ...interaction, timestamp: new Date().toISOString() });
  lead.lastInteractionAt = new Date().toISOString();
  await saveLeads(leads);
  return lead;
}

async function deleteLead(id) {
  let leads = await loadLeads();
  leads = leads.filter(l => l.id !== id);
  await saveLeads(leads);
}

async function getLeads(filters = {}) {
  let leads = await loadLeads();
  if (filters.status) leads = leads.filter(l => l.status === filters.status);
  if (filters.platform) leads = leads.filter(l => l.platform === filters.platform);
  if (filters.campaignId) leads = leads.filter(l => l.campaignId === filters.campaignId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    leads = leads.filter(l =>
      l.username.toLowerCase().includes(q) ||
      l.bio.toLowerCase().includes(q) ||
      l.notes.toLowerCase().includes(q)
    );
  }
  if (filters.minScore) leads = leads.filter(l => l.leadScore >= parseInt(filters.minScore));
  if (filters.maxScore) leads = leads.filter(l => l.leadScore <= parseInt(filters.maxScore));
  if (filters.tag) leads = leads.filter(l => l.tags.includes(filters.tag));
  const sortBy = filters.sortBy || 'leadScore';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
  leads.sort((a, b) => {
    const va = a[sortBy] || 0;
    const vb = b[sortBy] || 0;
    if (typeof va === 'string') return va.localeCompare(vb) * sortOrder;
    return (va - vb) * sortOrder;
  });
  return leads;
}

async function getLeadStats() {
  const leads = await loadLeads();
  const total = leads.length;
  const byStatus = {};
  const byPlatform = {};
  const byScore = { high: 0, medium: 0, low: 0 };
  let totalScore = 0;

  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    byPlatform[l.platform] = (byPlatform[l.platform] || 0) + 1;
    if (l.leadScore >= 70) byScore.high++;
    else if (l.leadScore >= 40) byScore.medium++;
    else byScore.low++;
    totalScore += l.leadScore;
  }

  return {
    total,
    byStatus,
    byPlatform,
    byScore,
    avgScore: total > 0 ? Math.round(totalScore / total) : 0,
    newToday: leads.filter(l =>
      new Date(l.discoveredAt).toDateString() === new Date().toDateString()
    ).length,
  };
}

async function createCampaign(data) {
  const campaigns = await loadCampaigns();
  const campaign = {
    id: uuidv4(),
    name: data.name || 'Untitled Campaign',
    description: data.description || '',
    platforms: data.platforms || ['tiktok'],
    keywords: data.keywords || [],
    accounts: data.accounts || [],
    targetLeads: data.targetLeads || 0,
    status: data.status || 'active',
    leadsCount: 0,
    conversions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  campaigns.push(campaign);
  await saveCampaigns(campaigns);
  return campaign;
}

async function updateCampaign(id, updates) {
  const campaigns = await loadCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  Object.assign(campaigns[idx], updates, { updatedAt: new Date().toISOString() });
  const leads = await loadLeads();
  campaigns[idx].leadsCount = leads.filter(l => l.campaignId === id).length;
  campaigns[idx].conversions = leads.filter(l => l.campaignId === id && l.status === 'converted').length;
  await saveCampaigns(campaigns);
  return campaigns[idx];
}

async function deleteCampaign(id) {
  let campaigns = await loadCampaigns();
  campaigns = campaigns.filter(c => c.id !== id);
  await saveCampaigns(campaigns);
  const leads = await loadLeads();
  for (const l of leads) {
    if (l.campaignId === id) l.campaignId = '';
  }
  await saveLeads(leads);
}

async function exportLeads(format = 'json', filters = {}) {
  const leads = await getLeads(filters);
  if (format === 'csv') {
    const headers = ['Username', 'Platform', 'Followers', 'Following', 'Score', 'Status', 'Bio', 'Source Video', 'Discovered At', 'Tags'];
    const rows = leads.map(l => [
      l.username, l.platform, l.followers, l.following, l.leadScore,
      l.status, `"${(l.bio || '').replace(/"/g, '""')}"`,
      l.sourceVideo, l.discoveredAt, (l.tags || []).join('; '),
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
  return JSON.stringify(leads, null, 2);
}

module.exports = {
  addLead, updateLead, deleteLead, getLeads, getLeadStats,
  addInteraction, calculateLeadScore,
  createCampaign, updateCampaign, deleteCampaign, loadCampaigns,
  exportLeads,
};
