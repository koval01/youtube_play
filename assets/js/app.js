let notify_hidden, timer_notify, video_id_link;
let video_loading = false;
const backend_host = "https://app-e2kzupurruxt8bx4oroby8gnga.herokuapp.com";

const update_video_id_link = () => {
    let video_id = window.location.hash.slice(1);
    if (video_id_link !== video_id && video_id.length) {
        video_id_link = video_id;
        update_video();
    } else if (!video_id.length) {
        notify("Video ID not specified");
    }
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

const request_call = (callback, url, method, json = false, json_body = null) => {
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

const get_video = (callback, video_id) => {
    request_call(
        function (r) {
            if (!r) {
                notify("Application server error");
                error_load_video();
            } else if (!r.success) {
                notify("Server-side function error");
                error_load_video();
            } else {
                callback(r.body);
            }
        },
        `${backend_host}/get_video`,
        "POST",
        true, {
            video_id: video_id
        }
    );
}

const update_video_observer = () => {
    let video = document.querySelector("video");
    video.onpause = (event) => {
        play_control(event);
    };
    video.onplay = (event) => {
        video_loading = false;
        play_control(event);
    };
    video.onwaiting = (_) => {
        video_loading = true;
        play_control({type: "pause"});
    };
    video.onplaying = (_) => {
        video_loading = false;
        play_control({type: "play"});
    };
}

const update_video = () => {
    let container = document.getElementById("video-container");

    let get_tags = (tags) => {
        let tags_result = "";
        if (tags) {
            for (let tag of tags) {
                tags_result += `#${tag}\x20`;
            }
        }
        return tags_result;
    }

    notify("Please wait, receiving data...");
    
    get_video(function (data) {
        let epoch = new Date(data.epoch * 1000);
        container.innerHTML = `
            <audio style="visibility: hidden;position: fixed;z-index: -1">
                <source src="${data.formats.audio.url}" type="audio/mpeg">
            </audio>
            <video controls>
                <source id="video-source" src="${data.formats.video.q480p.url}" type="video/mp4">
            </video>
            <div class="video-meta">
                <h1>${data.title}</h1>
                <div class="info-box">
                    <p class="views">${numberWithCommas(data.view_count)} views</p>
                    <span class="dot"></span>
                    <p>${epoch.toLocaleString('default', { month: 'short' }).slice(0, -1)} ${epoch.getDay()}, ${epoch.getFullYear()}</p>
                    <div class="stat-block">
                        <div class="thumb-up"></div>
                        <p>${numberWithCommas(data.like_count)}</p>
                    </div>
                </div>
                <p>${data.description.replaceAll("\n", "<br/>")}</p>
                <br/>
                <span class="video-tags">${get_tags(data.tags)}</span>
            </div>
        `;
        update_video_observer();
    }, video_id_link)
}

const notify = (text) => {
    let error_box = document.querySelector(".error_box_cst");
    let error_text = document.querySelector(".error_text_cst");

    let notify_hide = function () {
        error_box.style.marginBottom = "-150px";
        notify_hidden = true;
    };

    let notify_display = function () {
        notify_hidden = false;
        error_text.innerHTML = text;
        error_box.style.marginBottom = "0";
    };

    if (notify_hidden) {
        notify_display();
    } else {
        notify_hide();
        setTimeout(notify_display, 200);
    }

    clearTimeout(timer_notify);
    timer_notify = setTimeout(notify_hide, 2500);
}

const is_attention_splash = () => {
    let cookie = Cookies.get('attention_close');
    if (!cookie) {
        document.querySelector(".is-attention-splash").style.display = "";
    }
}

const close_attention_splash = () => {
    let splash = document.querySelector(".is-attention-splash");
    splash.style.marginTop = "-100vh"
    setTimeout(function () {
        splash.style.display = "none"
    }, 600)
    Cookies.set("attention_close", "1");
}

const generate_pseudo_line = (words, sized=[5, 20]) => {
    let string = "";
    for (let i = 0; i < words; i++) {
        string += repeatStringNumTimes("-", getRandomInt(sized[0], sized[1]))+"\x20";
    }
    return string
}

const error_load_video = () => {
    let container = document.getElementById("video-container");
    container.innerHTML = `
        <div class="pseudo-video"></div>
        <div class="video-meta flow-lines">
            <h1>${generate_pseudo_line(6)}</h1>
            <div class="info-box">
                <p class="views">--------- ------</p>
                <span class="dot"></span>
                <p>------- ----</p>
                <div class="stat-block">
                    <p>--------</p>
                </div>
            </div>
            <p>${generate_pseudo_line(40)}</p>
            <br/>
            <span class="video-tags">${generate_pseudo_line(getRandomInt(5, 20), [3, 10])}</span>
        </div>
    `;
}

const sync_time = () => {
    let video = document.querySelector("video");
    let audio = document.querySelector("audio");

    if (!video_loading) {
        audio.currentTime = video.currentTime;
    }
}

const play_control = (event) => {
    let audio = document.querySelector("audio");

    if (event.type === "play") {
        sync_time();
        audio.play().then(_ => {});
    } else if (event.type === "pause") {
        audio.pause();
    }
}

const loading_finish = () => {
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
    loading_finish();
    is_attention_splash();
    
    // default call
    error_load_video();

    update_video_id_link();
    window.onhashchange = (_) => {
        update_video_id_link();
    };
}