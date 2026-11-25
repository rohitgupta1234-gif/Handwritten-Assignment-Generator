const { initializeDatabase, queries, getDatabase, saveDatabase } = require('./dist/database/initialize.js');

async function test() {
  await initializeDatabase();
  const result = queries.createHandwritingProfile({
    id: 'test-profile-2',
    user_id: '55a6f6d5-781c-4c26-898b-79e188d35771',
    name: 'Test Handwriting',
    original_image_url: '/uploads/test.jpg',
    characteristics: '{"letterHeight":1.7,"letterWidth":2.2,"capitalHeight":14.2,"smallHeight":0.2,"characterSpacing":0.7,"wordSpacing":23.2,"lineSpacing":37.6,"writingAngle":-3.1,"penThickness":13.6,"baselineAlignment":0,"paragraphSpacing":12,"avgWordsPerLine":7,"pageMargins":{"top":1.4,"right":1.9,"bottom":3.9,"left":1.9},"slantDirection":"left","pressureVariation":67.6,"connectedness":6.4}',
    mode: 'personal',
    pen_color: 'blue'
  });
  console.log('Profile created:', result);

  // Force save
  saveDatabase();
  console.log('Database saved');

  // Verify
  const profile = queries.getHandwritingProfileById('test-profile-2');
  console.log('Profile:', JSON.stringify(profile, null, 2));
}

test().catch(console.error);