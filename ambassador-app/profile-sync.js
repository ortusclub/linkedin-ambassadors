const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let s3Client = null;
let s3Config = null;

async function initS3(apiBase, authToken) {
  if (s3Client && s3Config) return;

  try {
    const response = await fetch(`${apiBase}/api/profiles/sync`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (!response.ok) throw new Error('Failed to fetch sync config');
    s3Config = await response.json();

    s3Client = new S3Client({
      region: s3Config.region || 'auto',
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  } catch (err) {
    console.error('Failed to init S3:', err.message);
    throw err;
  }
}

function getProfileKey(profileId) {
  return `profiles/${profileId}.tar.gz`;
}

async function uploadProfile(profileId, profileDir, apiBase, authToken) {
  await initS3(apiBase, authToken);

  const chromeDataDir = path.join(profileDir, 'chrome-data');
  if (!fs.existsSync(chromeDataDir)) {
    console.log('No chrome-data to upload for', profileId);
    return false;
  }

  const tempFile = path.join(profileDir, '_upload.tar.gz');

  try {
    // Compress chrome-data directory
    console.log(`Compressing profile ${profileId}...`);
    execSync(`tar -czf "${tempFile}" -C "${profileDir}" chrome-data`, {
      timeout: 60000,
    });

    const fileBuffer = fs.readFileSync(tempFile);
    console.log(`Uploading profile ${profileId} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)...`);

    await s3Client.send(new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: getProfileKey(profileId),
      Body: fileBuffer,
      ContentType: 'application/gzip',
    }));

    console.log(`Profile ${profileId} uploaded successfully`);
    return true;
  } catch (err) {
    console.error(`Failed to upload profile ${profileId}:`, err.message);
    return false;
  } finally {
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
  }
}

async function downloadProfile(profileId, profileDir, apiBase, authToken) {
  await initS3(apiBase, authToken);

  const key = getProfileKey(profileId);

  try {
    // Check if profile exists in R2
    await s3Client.send(new HeadObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    }));
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.log(`No cloud profile found for ${profileId}`);
      return false;
    }
    throw err;
  }

  const tempFile = path.join(profileDir, '_download.tar.gz');

  try {
    console.log(`Downloading profile ${profileId}...`);

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    }));

    // Stream to file
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(tempFile, buffer);

    console.log(`Extracting profile ${profileId} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)...`);

    // Remove existing chrome-data before extracting
    const chromeDataDir = path.join(profileDir, 'chrome-data');
    if (fs.existsSync(chromeDataDir)) {
      fs.rmSync(chromeDataDir, { recursive: true, force: true });
    }

    // Extract
    execSync(`tar -xzf "${tempFile}" -C "${profileDir}"`, {
      timeout: 60000,
    });

    console.log(`Profile ${profileId} downloaded and extracted`);
    return true;
  } catch (err) {
    console.error(`Failed to download profile ${profileId}:`, err.message);
    return false;
  } finally {
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
  }
}

module.exports = { uploadProfile, downloadProfile };
