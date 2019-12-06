const port = Number(process.argv[2]) || 8080;
const io = require('socket.io')(port);
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const spawn = require('child_process').spawn;

function createFFmpegProcess(rtmp) {
    return spawn(ffmpegPath, [
        '-re',
        '-i',
        '-',
        '-vcodec',
        'copy',
        '-acodec',
        'aac',
        '-b:a',
        '192k',
        '-f',
        'flv',
        rtmp,
    ]);
}

let ffmpeg = null;
io.on('connection', function(socket) {
    socket.on('rtmp', rtmp => {
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGINT');
            ffmpeg = null;
        }

        ffmpeg = createFFmpegProcess(rtmp);

        // log 事件可以在浏览器打印消息
        socket.emit('log', '创建ffmpeg进程成功');

        ffmpeg.stdout.on('data', data => {
            console.log(String(data));
        });

        ffmpeg.stderr.on('data', data => {
            console.log(String(data));
        });

        ffmpeg.on('close', code => {
            // fail 事件可以在浏览器关闭推流
            socket.emit('fail');
            console.log('ffmpeg进程退出：' + code);
        });
    });

    socket.on('binarystream', data => {
        if (ffmpeg) {
            ffmpeg.stdin.write(data);
        }
    });

    socket.on('disconnect', () => {
        if (ffmpeg) {
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGINT');
            ffmpeg = null;
        }
    });
});
