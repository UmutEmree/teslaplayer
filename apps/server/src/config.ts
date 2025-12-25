export const config = {
  port: parseInt(process.env.PORT || '4000'),
  wsBasePort: parseInt(process.env.WS_BASE_PORT || '8081'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  channels: [
    {
      id: 'showtv',
      name: 'Show TV',
      logo: '/channels/showtv.png',
      hlsUrl: 'https://rmtftbjlne.turknet.ercdn.net/bpeytmnqyp/showtv/showtv_480p.m3u8'
    }
  ],

  ffmpeg: {
    videoCodec: 'mpeg1video',
    audioCodec: 'mp2',
    videoBitrate: '1500k',
    audioBitrate: '128k',
    resolution: '960x540',
    frameRate: 25,
    sampleRate: 44100
  }
};
