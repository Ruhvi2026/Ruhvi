// Cloudinary Upload Utility for RuhChat Mobile

const CLOUDINARY_CLOUD_NAME = 'io1kkukg';
const CLOUDINARY_API_KEY = '522811694238476';
const CLOUDINARY_API_SECRET = '4InB0lp_J8h_NUwTCp3NVBXalOs';

function sha1(str: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvtHex(val: number) {
    let str = "";
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  }

  const utf8 = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const byteLen = utf8.length;
  words[byteLen >> 2] |= 0x80 << (24 - (byteLen % 4) * 8);
  words[(((byteLen + 8) >> 6) << 4) + 15] = byteLen * 8;

  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;

  const W = new Array(80);
  for (let i = 0; i < words.length; i += 16) {
    let A = H0, B = H1, C = H2, D = H3, E = H4;
    for (let t = 0; t < 80; t++) {
      if (t < 16) W[t] = words[i + t] || 0;
      else W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);

      let temp: number;
      if (t < 20) temp = (rotateLeft(A, 5) + ((B & C) | (~B & D)) + E + W[t] + 0x5a827999) | 0;
      else if (t < 40) temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[t] + 0x6ed9eba1) | 0;
      else if (t < 60) temp = (rotateLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[t] + 0x8f1bbcdc) | 0;
      else temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[t] + 0xca62c1d6) | 0;

      E = D;
      D = C;
      C = rotateLeft(B, 30);
      B = A;
      A = temp;
    }
    H0 = (H0 + A) | 0;
    H1 = (H1 + B) | 0;
    H2 = (H2 + C) | 0;
    H3 = (H3 + D) | 0;
    H4 = (H4 + E) | 0;
  }
  return cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4);
}

import * as FileSystem from 'expo-file-system/legacy';

export interface UploadResult {
  cloudinary_url: string;
  cloudinary_public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  file_name: string;
  mime_type: string;
  file_size?: number;
  width?: number;
  height?: number;
}

export async function uploadToCloudinary(
  fileDataOrUri: string,
  fileName: string,
  mimeType: string,
  fileSize?: number
): Promise<UploadResult> {
  const lowerName = (fileName || '').toLowerCase();
  const isImage = mimeType.startsWith('image/') || 
    lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || 
    lowerName.endsWith('.png') || lowerName.endsWith('.webp') || 
    lowerName.endsWith('.gif');
  const isVideo = mimeType.startsWith('video/') || 
    lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || 
    lowerName.endsWith('.mov');
  const resourceType = isVideo ? 'video' : isImage ? 'image' : 'raw';

  const folder = 'ruhvi/chat_attachments';
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(signaturePayload);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  // Function to perform multipart upload with data URI
  const uploadBase64Data = async (dataUri: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary error response:', errorText);
      try {
        const errJson = JSON.parse(errorText);
        throw new Error(errJson.error?.message || response.statusText);
      } catch (e: any) {
        throw new Error(e.message || response.statusText);
      }
    }

    const data = await response.json();
    return {
      cloudinary_url: data.secure_url,
      cloudinary_public_id: data.public_id,
      resource_type: resourceType,
      file_name: fileName || data.original_filename || 'file',
      mime_type: mimeType,
      file_size: fileSize || data.bytes,
      width: data.width,
      height: data.height,
    };
  };

  // 1. If already a Base64 Data URI, upload directly
  if (fileDataOrUri.startsWith('data:')) {
    return await uploadBase64Data(fileDataOrUri);
  }

  // 2. Safe local file copy to avoid SAF permission issues & Response.blob() overhead
  let targetUri = fileDataOrUri;
  const cleanExt = lowerName.includes('.') ? lowerName.substring(lowerName.lastIndexOf('.')) : (isImage ? '.jpg' : '.pdf');
  const safeCachePath = `${FileSystem.cacheDirectory}chat_${Date.now()}${cleanExt}`;
  
  try {
    await FileSystem.copyAsync({
      from: fileDataOrUri,
      to: safeCachePath,
    });
    targetUri = safeCachePath;
  } catch (copyErr) {
    console.warn('FileSystem.copyAsync failed, using raw URI:', copyErr);
  }

  // 3. Perform native upload via FileSystem.uploadAsync
  try {
    const uploadResponse = await FileSystem.uploadAsync(uploadUrl, targetUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: mimeType || (isImage ? 'image/jpeg' : 'application/pdf'),
      parameters: {
        api_key: CLOUDINARY_API_KEY,
        timestamp: timestamp.toString(),
        signature: signature,
        folder: folder,
      },
    });

    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      let errMsg = `Upload failed with status ${uploadResponse.status}`;
      try {
        const errObj = JSON.parse(uploadResponse.body);
        errMsg = errObj.error?.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = JSON.parse(uploadResponse.body);
    return {
      cloudinary_url: data.secure_url,
      cloudinary_public_id: data.public_id,
      resource_type: resourceType,
      file_name: fileName || data.original_filename || 'file',
      mime_type: mimeType,
      file_size: fileSize || data.bytes,
      width: data.width,
      height: data.height,
    };
  } catch (fsErr: any) {
    console.warn('FileSystem.uploadAsync failed, falling back to direct disk base64 read:', fsErr);
    // Read directly from disk file without response.blob()!
    try {
      const base64Data = await FileSystem.readAsStringAsync(targetUri, {
        encoding: 'base64' as any,
      });
      const dataUri = `data:${mimeType || (isImage ? 'image/jpeg' : 'application/pdf')};base64,${base64Data}`;
      return await uploadBase64Data(dataUri);
    } catch (readErr: any) {
      console.error('All upload strategies failed:', readErr);
      throw new Error(fsErr?.message || readErr?.message || 'Could not upload file to Cloudinary');
    }
  }
}
