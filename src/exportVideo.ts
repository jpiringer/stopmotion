const exportVideo = (images: string[], frameRate: number, width: number, height: number, progressCallBack: (e: number) => void) => {
    var canvas = document.createElement('canvas');
    canvas.setAttribute("width", width.toString());
    canvas.setAttribute("height", height.toString());
    var context = canvas.getContext("2d");
    var frameCount = 0;
    var timer : NodeJS.Timer;

    if (canvas !== null) {
        var videoStream = canvas.captureStream(frameRate*2);
        var mediaRecorder = new MediaRecorder(videoStream);

        const draw = () => {
            if (context !== null) {
                let imageSrc = images[frameCount % images.length];
                var image = new Image();
                image.src = imageSrc;
                context.drawImage(image, 0, 0, context.canvas.width, context.canvas.height);
                frameCount++;
                progressCallBack(frameCount / images.length);
                if (frameCount > images.length) {
                    clearInterval(timer);
                    mediaRecorder.stop();
                }
            }
        }

        var chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = function(e) {
            var blob = new Blob(chunks, { 'type' : 'video/mp4' });
            chunks = [];

            // this will create a link tag on the fly
            // <a href="..." download>
            var link = document.createElement('a');
            link.setAttribute('href', URL.createObjectURL(blob));
            link.setAttribute('download', 'video.mp4');

            // NOTE: We need to add temporarily the link to the DOM so
            //       we can trigger a 'click' on it.
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
        };

        mediaRecorder.start();
        timer = setInterval(draw, 1000/frameRate);
    }
}

export default exportVideo;