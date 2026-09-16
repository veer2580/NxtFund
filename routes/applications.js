const express = require('express');
const { getDb } = require('../database/setup');
const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const d = req.body;
    const v = k => (d[k] === undefined || d[k] === '') ? null : d[k];
    const db = await getDb();
    await db.collection('applications').insertOne({
      founder_name: v('founder_name'),
      founder_email: v('founder_email'),
      founder_linkedin: v('founder_linkedin'),
      founder_role: v('founder_role'),
      company_name: v('company_name'),
      company_description: v('company_description'),
      company_url: v('company_url'),
      company_location: v('company_location'),
      stage: v('stage'),
      monthly_expenses: v('monthly_expenses'),
      monthly_revenue: v('monthly_revenue'),
      active_users: v('active_users'),
      product_description: v('product_description'),
      motivation: v('motivation'),
      novelty: v('novelty'),
      competitors: v('competitors'),
      unique_insight: v('unique_insight'),
      business_model: v('business_model'),
      incorporated: v('incorporated'),
      incorporation_location: v('incorporation_location'),
      equity_split: v('equity_split'),
      past_funding: v('past_funding'),
      requested_amount: v('requested_amount'),
      batch_preference: v('batch_preference'),
      additional_info: v('additional_info'),
      video_file: v('video_file'),
      demo_file: v('demo_file'),
      status: 'pending',
      submitted_at: new Date()
    });
    res.json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

module.exports = router;