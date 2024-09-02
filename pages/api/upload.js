import aws from 'aws-sdk';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

aws.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true,
});

const s3 = new aws.S3();
const upload = multer({ dest: 'uploads/' });

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadMiddleware = promisify(upload.single('file'));

export default async function handler(req, res) {
  await uploadMiddleware(req, res);
  
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const outputPath = path.join('uploads', `${file.filename}.m3u8`);
  
  ffmpeg(file.path)
    .setFfmpegPath(ffmpegStatic)
    .output(outputPath)
    .outputOptions([
      '-codec: copy',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls'
    ])
    .on('end', async () => {
      const fileStream = fs.createReadStream(outputPath);
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `${file.filename}.m3u8`,
        Body: fileStream,
        ContentType: 'application/vnd.apple.mpegurl',
      };
      
      await s3.upload(uploadParams).promise();

      fs.unlinkSync(file.path);
      fs.unlinkSync(outputPath);
      
      const embedCode = `<video src="https://${process.env.S3_BUCKET_NAME}.${process.env.S3_REGION}.s3.amazonaws.com/${file.filename}.m3u8" controls></video>`;

      res.status(200).json({ embedCode });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'HLS encoding failed.', details: err.message });
    })
    .run();
}