import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

// Hetzner Object Storage Konfiguration
// Unterstützt beide Varianten: S3_ACCESS_KEY/S3_SECRET_KEY und S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY
const getAccessKey = () => process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || import.meta.env.S3_ACCESS_KEY_ID || import.meta.env.S3_ACCESS_KEY || '';
const getSecretKey = () => process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || import.meta.env.S3_SECRET_ACCESS_KEY || import.meta.env.S3_SECRET_KEY || '';
const getEndpoint = () => process.env.S3_ENDPOINT || import.meta.env.S3_ENDPOINT || '';
const getRegion = () => process.env.S3_REGION || import.meta.env.S3_REGION || 'eu-central';
const getBucket = () => process.env.S3_BUCKET || import.meta.env.S3_BUCKET || '';
const getPrefix = () => process.env.S3_PREFIX || import.meta.env.S3_PREFIX || 'Auszeit/';

// Lazy initialization - S3Client wird erst bei Bedarf erstellt
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const endpoint = getEndpoint();
    const accessKey = getAccessKey();
    const secretKey = getSecretKey();
    const region = getRegion();

    console.log('[S3] Creating S3Client with config:', {
      endpoint: endpoint ? endpoint.substring(0, 40) : 'MISSING',
      region,
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey,
    });

    _s3Client = new S3Client({
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Wichtig für Hetzner
    });
  }
  return _s3Client;
}

// Lazy getter für Bucket und Prefix
function getBucketName(): string {
  return getBucket();
}

function getDataPrefix(): string {
  return `${getPrefix()}data/`;
}

// S3-Key mit Projekt-Präfix erstellen
export function getS3Key(path: string): string {
  const prefix = getPrefix();
  // Wenn der Pfad bereits mit dem Präfix beginnt, nicht nochmal hinzufügen
  if (path.startsWith(prefix)) {
    return path;
  }
  return `${prefix}${path}`;
}

// Prüfen ob S3 konfiguriert ist
export function isS3Configured(): boolean {
  const endpoint = getEndpoint();
  const accessKey = getAccessKey();
  const secretKey = getSecretKey();
  const bucket = getBucket();

  console.log('[S3] Config check:', {
    hasEndpoint: !!endpoint,
    hasAccessKey: !!accessKey,
    hasSecretKey: !!secretKey,
    hasBucket: !!bucket,
    endpoint: endpoint ? endpoint.substring(0, 30) + '...' : 'MISSING',
    bucket: bucket || 'MISSING'
  });

  return !!(endpoint && accessKey && secretKey && bucket);
}

// Bild hochladen
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucket = getBucketName();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await getS3Client().send(command);

  // Öffentliche URL zurückgeben
  return `${getEndpoint()}/${bucket}/${key}`;
}

// Bild löschen
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getS3Client().send(command);
}

// Alle Bilder in einem Ordner auflisten
export async function listS3Objects(prefix: string): Promise<{
  key: string;
  url: string;
  size: number;
  lastModified: Date;
}[]> {
  const bucket = getBucketName();
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await getS3Client().send(command);

  return (response.Contents || []).map((obj) => ({
    key: obj.Key || '',
    url: `${getEndpoint()}/${bucket}/${obj.Key}`,
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(),
  }));
}

// Content-Type aus Dateiname ermitteln
export function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return types[ext || ''] || 'application/octet-stream';
}

// ============== JSON DATA STORAGE IN S3 ==============

// JSON-Daten aus S3 lesen
export async function readJsonFromS3<T>(filename: string, defaultValue: T): Promise<T> {
  if (!isS3Configured()) {
    throw new Error('S3 not configured');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: `${getDataPrefix()}${filename}`,
    });

    const response = await getS3Client().send(command);
    const bodyString = await response.Body?.transformToString();

    if (!bodyString) {
      return defaultValue;
    }

    return JSON.parse(bodyString) as T;
  } catch (error: any) {
    // Datei existiert nicht - Default zurückgeben
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return defaultValue;
    }
    throw error;
  }
}

// JSON-Daten in S3 speichern
export async function writeJsonToS3<T>(filename: string, data: T): Promise<void> {
  if (!isS3Configured()) {
    throw new Error('S3 not configured');
  }

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: `${getDataPrefix()}${filename}`,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  });

  await getS3Client().send(command);
}

// Bild aus S3 lesen
export async function getImageFromS3(key: string): Promise<Buffer | null> {
  if (!isS3Configured()) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const response = await getS3Client().send(command);

    if (!response.Body) {
      return null;
    }

    // Body in Buffer konvertieren
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error('Error reading image from S3:', error);
    return null;
  }
}

