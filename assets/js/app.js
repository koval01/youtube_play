let notify_hidden, timer_notify, video_id_link;
let video_loading = false;
let audio_stream = true;
const backend_host = "https://app-e2kzupurruxt8bx4oroby8gnga.herokuapp.com";

const updateVideoIdLink = () => {
    let video_id = window.location.hash.slice(1);
    if (video_id_link !== video_id && video_id.length) {
        video_id_link = video_id;
        updateVideo();
    } else if (!video_id.length) {
        notify("Video ID not specified");
    }
}

const linkify = (inputText) => {
    var replacedText, replacePattern1, replacePattern2, replacePattern3;

    replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

    replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

    replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

    return replacedText;
}

const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

const repeatStringNumTimes = (string, times) => {
    var repeatedString = "";
    while (times > 0) {
        repeatedString += string;
        times--;
    }
    return repeatedString;
}

const requestCall = (callback, url, method, json = false, json_body = null) => {
    let request = new XMLHttpRequest();
    let json_body_local = {};
    request.open(method, url, true);

    if (method.toUpperCase() === "POST") {
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        json_body_local = JSON.stringify(json_body);
    }

    request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
            if (json) {
                callback(JSON.parse(request.responseText));
            } else {
                callback(request.responseText);
            }
        } else {
            console.log(`Request status code is ${request.status}`);
        }
    };

    request.onerror = function (error) {
        console.log(`Error make request! Details: ${error}`);
        callback(null)
    };

    request.onreadystatechange = () => {
        if (request.status >= 400) {
            if (json) {
                callback({
                    success: false
                });
            } else {
                callback(null);
            }
        }
    };

    request.send(json_body_local);
}

const getVideo = (callback, video_id) => {
    requestCall(
        function (r) {
            if (!r) {
                notify("Application server error");
                errorLoadVideo();
            } else if (!r.success) {
                notify("Server-side function error");
                errorLoadVideo();
            } else {
                callback(r.body);
            }
        },
        `${backend_host}/getVideo`,
        "POST",
        true, {
            video_id: video_id
        }
    );
}

const updateVideoObserver = () => {
    let video = document.querySelector("video");
    video.onpause = (event) => {
        playControl(event);
    };
    video.onplay = (event) => {
        video_loading = false;
        playControl(event);
    };
    video.onwaiting = (_) => {
        video_loading = true;
        playControl({type: "pause"});
    };
    video.onplaying = (_) => {
        video_loading = false;
        playControl({type: "play"});
    };
}

const updateVideo = () => {
    let container = document.getElementById("video-container");

    let getTags = (tags) => {
        let tags_result = "";
        if (tags) {
            for (let tag of tags) {
                tags_result += `#${tag}\x20`;
            }
        }
        return tags_result;
    }

    notify("Please wait, receiving data...");
    
    getVideo(function (data) {
        let formats = data.formats.video;
        let quality = Object.keys(formats)[Object.keys(formats).length - 1];
        let video = formats[quality];
        audio_stream = video.acodec === "none";
        let date_publish = "";
        console.log(
            `${video_id_link}: Q=${quality} FPS=${video.fps} VCODEC=${video.vcodec} EXT=${video.video_ext}`
        );
        if (data.release_timestamp) {
            let epoch = new Date(data.release_timestamp * 1000);
            date_publish = `
                <span class="dot"></span>
                <p>${epoch.toLocaleString('default', { month: 'short' }).slice(0, 3)} ${epoch.toLocaleString('default', { day: 'numeric' })}, ${epoch.getFullYear()}</p>
            `;
        }
        container.innerHTML = `
            <audio style="visibility: hidden;position: fixed;z-index: -1">
                <source src="${data.formats.audio.url}" type="audio/mpeg">
            </audio>
            <video controls>
                <source id="video-source" src="${video.url}" type="video/mp4">
            </video>
            <div class="video-meta">
                <h1>${data.title}</h1>
                <div class="info-box">
                    <p class="views">${numberWithCommas(data.view_count)} views</p>
                    ${date_publish}
                    <div class="stat-block">
                        <div class="thumb-up"></div>
                        <p>${data.like_count ? numberWithCommas(data.like_count) : ''}</p>
                    </div>
                </div>
                <p>${linkify(data.description.replaceAll("\n", "<br/>"))}</p>
                <br/>
                <span class="video-tags">${getTags(data.tags)}</span>
            </div>
        `;
        updateVideoObserver();
    }, video_id_link)
}

const notify = (text) => {
    let error_box = document.querySelector(".error_box_cst");
    let error_text = document.querySelector(".error_text_cst");

    let notifyHide = function () {
        error_box.style.marginBottom = "-150px";
        notify_hidden = true;
    };

    let notifyDisplay = function () {
        notify_hidden = false;
        error_text.innerHTML = text;
        error_box.style.marginBottom = "0";
    };

    if (notify_hidden) {
        notifyDisplay();
    } else {
        notifyHide();
        setTimeout(notifyDisplay, 200);
    }

    clearTimeout(timer_notify);
    timer_notify = setTimeout(notifyHide, 2500);
}

const isAttentionSplash = () => {
    let cookie = Cookies.get('attention_close');
    if (!cookie) {
        document.querySelector(".is-attention-splash").style.display = "";
    }
}

const closeAttentionSplash = () => {
    let splash = document.querySelector(".is-attention-splash");
    splash.style.marginTop = "-100vh"
    setTimeout(function () {
        splash.style.display = "none"
    }, 600)
    Cookies.set("attention_close", "1");
}

const generatePseudoLine = (words, sized=[5, 20]) => {
    let string = "";
    for (let i = 0; i < words; i++) {
        string += repeatStringNumTimes("-", getRandomInt(sized[0], sized[1]))+"\x20";
    }
    return string
}

const errorLoadVideo = () => {
    let container = document.getElementById("video-container");
    container.innerHTML = `
        <div class="pseudo-video"></div>
        <div class="video-meta flow-lines">
            <h1>${generatePseudoLine(6)}</h1>
            <div class="info-box">
                <p class="views">--------- ------</p>
                <span class="dot"></span>
                <p>------- ----</p>
                <div class="stat-block">
                    <p>--------</p>
                </div>
            </div>
            <p>${generatePseudoLine(40)}</p>
            <br/>
            <span class="video-tags">${generatePseudoLine(getRandomInt(5, 20), [3, 10])}</span>
        </div>
    `;
}

const syncTime = () => {
    let video = document.querySelector("video");
    let audio = document.querySelector("audio");

    if (!video_loading) {
        audio.currentTime = video.currentTime;
    }
}

const playControl = (event) => {
    let audio = document.querySelector("audio");

    if (event.type === "play") {
        syncTime();
        if (audio_stream) {
            audio.play().then(_ => {});
        } else {
            audio.pause();
        }
    } else if (event.type === "pause") {
        audio.pause();
    }
}

const loadingFinish = () => {
    let preloader = document.querySelector(".page-loading");
    let wait = 500;
    let move_wait = 100;
    setTimeout(function () {
        preloader.classList.remove("active");
    }, wait);
    setTimeout(function () {
        preloader.remove();
    }, wait + move_wait);
}

window.onload = function () {
    loadingFinish();
    isAttentionSplash();
    
    // default call
    errorLoadVideo();

    updateVideoIdLink();
    window.onhashchange = (_) => {
        updateVideoIdLink();
    };
}