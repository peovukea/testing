document.addEventListener('DOMContentLoaded', () => {
    const ball = document.getElementById('ball');
    const container = document.getElementById('container');
    const startButton = document.getElementById('startButton');
    const containerRect = container.getBoundingClientRect();
    const maxX = containerRect.width - ball.offsetWidth;
    const maxY = containerRect.height - ball.offsetHeight;

    let x = 0;
    let y = 0;

    const socket = io();

    function handleOrientation(event) {
        // Adjust these values to control the sensitivity and direction
        x += event.gamma / 10;
        y += event.beta / 10;

        // Ensure the ball stays within the container
        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));

        // Send gyroscope data to the server
        socket.emit('gyroscopeData', { x, y });
    }

    function startGyroscope() {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        console.log(event.alpha + ' : ' + event.beta + ' : ' + event.gamma);
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    startButton.addEventListener('click', startGyroscope);

    // Receive gyroscope data from the server
    socket.on('gyroscopeData', (data) => {
        ball.style.transform = `translate(${data.x}px, ${data.y}px)`;
    });
});
