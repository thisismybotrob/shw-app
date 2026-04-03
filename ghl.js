// ghl.js — GoHighLevel API helper
const GHL = {
  token: 'pit-b117aa50-e8a1-4e6a-a59a-06791072a753',
  locationId: 'yvNhywMU0Z5rVZEuFbNm',
  base: 'https://services.leadconnectorhq.com',

  headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  },

  async searchContacts(query) {
    if (!query || query.length < 2) return [];
    try {
      const r = await fetch(`${this.base}/contacts/?locationId=${this.locationId}&query=${encodeURIComponent(query)}&limit=10`, {
        headers: this.headers()
      });
      const d = await r.json();
      return d.contacts || [];
    } catch (e) { console.error('GHL searchContacts:', e); return []; }
  },

  async getContact(id) {
    try {
      const r = await fetch(`${this.base}/contacts/${id}`, { headers: this.headers() });
      return await r.json();
    } catch (e) { console.error('GHL getContact:', e); return null; }
  },

  async createContact(data) {
    try {
      const r = await fetch(`${this.base}/contacts/`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ...data, locationId: this.locationId })
      });
      return await r.json();
    } catch (e) { console.error('GHL createContact:', e); return null; }
  },

  async getPipelines() {
    try {
      const r = await fetch(`${this.base}/opportunities/pipelines?locationId=${this.locationId}`, {
        headers: this.headers()
      });
      const d = await r.json();
      return d.pipelines || [];
    } catch (e) { console.error('GHL getPipelines:', e); return []; }
  },

  async getOpportunities(pipelineId, stageId) {
    try {
      let url = `${this.base}/opportunities/search?locationId=${this.locationId}&pipelineId=${pipelineId}`;
      if (stageId) url += `&stageId=${stageId}`;
      const r = await fetch(url, {
        method: 'GET',
        headers: this.headers()
      });
      const d = await r.json();
      return d.opportunities || [];
    } catch (e) { console.error('GHL getOpportunities:', e); return []; }
  },

  async searchOpportunities(pipelineId, query) {
    try {
      let url = `${this.base}/opportunities/search?locationId=${this.locationId}&pipelineId=${pipelineId}&q=${encodeURIComponent(query || '')}`;
      const r = await fetch(url, {
        method: 'GET',
        headers: this.headers()
      });
      const d = await r.json();
      return d.opportunities || [];
    } catch (e) { console.error('GHL searchOpps:', e); return []; }
  },

  async createOpportunity(data) {
    try {
      const r = await fetch(`${this.base}/opportunities/`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ...data, locationId: this.locationId })
      });
      return await r.json();
    } catch (e) { console.error('GHL createOpp:', e); return null; }
  },

  async updateOpportunity(id, data) {
    try {
      const r = await fetch(`${this.base}/opportunities/${id}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(data)
      });
      return await r.json();
    } catch (e) { console.error('GHL updateOpp:', e); return null; }
  },

  async getOpportunity(id) {
    try {
      const r = await fetch(`${this.base}/opportunities/${id}`, {
        headers: this.headers()
      });
      return await r.json();
    } catch (e) { console.error('GHL getOpp:', e); return null; }
  },

  // Cache pipelines/stages
  _pipelineCache: null,
  async ensurePipeline() {
    if (this._pipelineCache) return this._pipelineCache;
    const pipelines = await this.getPipelines();
    // Find "Jobs" pipeline or first one
    let p = pipelines.find(p => /job/i.test(p.name)) || pipelines[0];
    if (p) {
      this._pipelineCache = p;
      return p;
    }
    return null;
  },

  getStageColor(stageName) {
    const colors = {
      'new lead': '#3498db',
      'quote sent': '#f39c12',
      'quote approved': '#27ae60',
      'glass ordered': '#8e44ad',
      'glass received': '#2980b9',
      'job scheduled': '#e67e22',
      'job complete': '#27ae60',
      'invoiced': '#16a085',
      'paid': '#2ecc71',
      'lost': '#e74c3c',
    };
    return colors[(stageName || '').toLowerCase()] || '#95a5a6';
  }
};
