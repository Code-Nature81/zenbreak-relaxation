const ffmpeg = require('fluent-ffmpeg');

ffmpeg('input.mp3')
  .audioBitrate('96k')
  .save('output.mp3')
  .on('end', () => console.log('Compression terminée !'));
