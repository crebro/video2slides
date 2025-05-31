import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function ActionComponent() {
  const [loaded, setLoaded] = useState(false);
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);
    const messageRef = useRef<HTMLParagraphElement>(null);

    const load = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on('log', ({ message }) => {
            if (!messageRef.current) return;
            messageRef.current.innerHTML = message;
            console.log(message);
        });
        // toBlobURL is used to bypass CORS issue, urls with the same
        // domain can be used directly.
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
    }

    const transcode = async () => {
        const ffmpeg = ffmpegRef.current;
        await ffmpeg.writeFile('input.webm', await fetchFile('https://raw.githubusercontent.com/ffmpegwasm/testdata/master/Big_Buck_Bunny_180_10s.webm'));
        await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
        const data = await ffmpeg.readFile('output.mp4');
        if (!videoRef.current) return;
        videoRef.current.src = // @ts-expect-error
            URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    }



  return (
       <div className="hero bg-base-200 min-h-screen">
                <div className="hero-content text-center">
                    <div className="max-w-md">
                        <h1 className="text-5xl font-bold">VIDEO2DOC</h1>
                        <p className="py-6">
                            Convert any presentation style videos into a pdf document with only the slides. No more screenshots and having to sit through the entire video.

                        </p>

                        <div className="tabs tabs-lift">
                            <label className="tab">
                                <input type="radio" name="my_tabs_4" />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" /></svg>
                                Upload a video
                            </label>
                            <div className="tab-content bg-base-100 border-base-300 p-6">
                                <input type="file" className="file-input file-input-primary" />
                                <div className='relative mt-2'>
                                    <button className="btn btn-secondary w-1/2">Get Document</button>
                                    <div className="tooltip absolute ml-2 h-full" data-tip="When you click on get document, the ffmpeg processing library [~31 mb] will be downloaded to process your request on your own machine.">
                                        <div className='flex items-center justify-center h-full w-6'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                        </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="tab">
                                <input type="radio" name="my_tabs_4" defaultChecked />
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-4 me-2" >
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                </svg>

                                Use a youtube link
                            </label>
                            <div className="tab-content bg-base-100 border-base-300 p-6">

                                <label className="input">
                                    <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <g
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                            strokeWidth="2.5"
                                            fill="none"
                                            stroke="currentColor"
                                        >
                                            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                                            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                                        </g>
                                    </svg>
                                    <input type="text" className="grow" placeholder="... add your link here" />
                                </label>
                                <div className='relative mt-2'>
                                    <button className="btn btn-secondary w-1/2">Get Document</button>
                                    <div className="tooltip absolute ml-2 h-full" data-tip="When you click on get document, the ffmpeg processing library [~31 mb] will be downloaded to process your request on your own machine.">
                                        <div className='flex items-center justify-center h-full w-6'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                        </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

  )
}
