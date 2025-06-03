import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import DOMpurify from 'dompurify';
import { imagesToOriginalSizePdf } from '../utils/load-image-from-blob';
import rmsDiff from '../utils/rms-diffs';
import imageToRGBA from '../utils/rgba-standardization';

export default function ActionComponent() {
  const [loaded, setLoaded] = useState(false);
    const ffmpegRef = useRef(new FFmpeg());
    const urlInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [messages, setMessages] = useState<any[]>([]);
    
    const load = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        const ffmpeg = ffmpegRef.current;
        
        // toBlobURL is used to bypass CORS issue, urls with the same
        // domain can be used directly.
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
    }

    const getMetadata = (inputFile: string): Promise<string> => {
        const ffmpeg = ffmpegRef.current;
        return new Promise((resolve) => {
            let log = '';
            let metadataLogger = ({ message }: { message: string}) => {
                log += message;
                if (message.indexOf('Aborted()') > -1) {
                    ffmpeg.off('log', metadataLogger);
                    resolve(log);
                }
            };
            ffmpeg.on('log', metadataLogger);
            ffmpeg.exec(["-i", inputFile]);
        });
    };

    const getDuration = async (inputFile: string) => {
        var metadata = await getMetadata(inputFile);
        var patt = /Duration:\s*([0-9]{2}):([0-9]{2}):([0-9]{2}.[0-9]{0,2})/gm
        let m = patt.exec(metadata);

        if (!m) return 0;

        const hours = parseFloat(m[1]);
        const minutes = parseFloat(m[2]);
        const seconds = parseFloat(m[3]);
        
        return (hours * 3600) + (minutes * 60) + seconds;
    };

    const convertToPdfViaFile = async () => {
        if (!loaded) {
            console.error('FFmpeg is not loaded yet.');
            await load();
        }

        const ffmpeg = ffmpegRef.current;
        const file = fileInputRef.current?.files?.[0];
        let inputFile = `input.${file?.name.split('.').pop()}`;
        if (!file || !inputFile) {
            return;
        }
        await ffmpeg.writeFile(inputFile, await fetchFile(file));
        await convertToPdf(inputFile);
        return inputFile;
    }

    const converToPdfViaUrl = async (downloadLink: string): Promise<string> => {
        const ffmpeg = ffmpegRef.current;
        const inputFile = `input.${downloadLink.split('.').pop()}`;
        const proxyRequestLocation = `https://fileproxy-p4qizvvwvq-uc.a.run.app?url=${encodeURIComponent(downloadLink)}`;
        await ffmpeg.writeFile(inputFile, await fetchFile(proxyRequestLocation));
        await convertToPdf(inputFile);
        return inputFile;
    }

    const convertToPdf = async (inputFile: string) => {
        const ffmpeg = ffmpegRef.current;

        let duration = await getDuration(inputFile);

        ffmpeg.on('log', (message: {message: string}) => {
            console.log(message);
        });
        // first convert file into mp4 file
        await ffmpeg.exec([
            '-i', inputFile,
            '-vf', `fps=1/10`, // Extract one frame every 10 seconds
            // '-q:v', '2', // Set quality level (lower is better, 1-31)
            'output_%04d.png'
        ]);

        let allFiles: Array<HTMLImageElement> = [];

        let uint8Store: Uint8Array | null = null;

        for (let i = 1; i <= Math.floor(duration / 10); i++) {
            console.log(`Processing frame ${i}`);
            try {
                const fileName = `output_${i.toString().padStart(4, '0')}.png`;
                const data = await ffmpeg.readFile(fileName);
                // @ts-expect-error
                let buffer = data.buffer;
                let uint8barrayitem = new Uint8Array(buffer);
                // standardize the image to RGBA format, using context
                let rgbaImage = await imageToRGBA(uint8barrayitem);
                uint8barrayitem = rgbaImage.arrayInstance;

                if (uint8Store === null) {
                    uint8Store = uint8barrayitem;
                } else {
                    if (uint8Store.length !== uint8barrayitem.length) {
                        console.log(`Frame ${i} has different dimensions, updating store.`);
                    } else if (rmsDiff(uint8Store, uint8barrayitem) < 5) {
                        console.log(`Skipping frame ${i} as it is identical to the previous frame.`);
                        continue; // Skip identical frames
                    }
                    // If not identical, update the store
                    uint8Store = uint8barrayitem;
                }

                allFiles.push(rgbaImage.imageInstance);
            } catch (e) {
                console.log(
                    `Error reading file output_${i.toString().padStart(4, '0')}.png: ${e}`
                );
                break; // Stop if no more files are found
            }
        }

        imagesToOriginalSizePdf(allFiles).then(pdfBlob => {
            // Create download link
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'video2doc-output.pdf';
            a.click();
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100);
        })
        .catch(error => {
            console.error('PDF generation failed:', error);
        });;

    }

    let controller: AbortController;
    let signal: AbortSignal;
    const parser = new DOMParser();

    useEffect(() => {
        controller = new AbortController();
        signal = controller.signal;

        return () => {
            controller.abort(); // Cleanup on unmount
        };
    }, []);

    const ytdlpDownload = async () => {
        if (!loaded) {
            console.error('FFmpeg is not loaded yet.');
            await load();
        }

        if (!urlInputRef.current) return;
        const functionUrl = `https://forwarddlprequest-p4qizvvwvq-uc.a.run.app?url=${urlInputRef.current.value} -S vcodec:h264`;

        try {
            const response = await fetch(functionUrl, {signal});

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const response = await reader.read();

                if (response.done) {
                    console.log('Stream finished');
                    break;
                }

                const chunk = decoder.decode(response.value, { stream: true });
                try {
                    if (chunk.includes('<a ')) {
                        console.log('Download link found:', chunk);
                        let parsed = parser.parseFromString(chunk, 'text/html');
                        let downloadLocation = parsed.getElementsByTagName('a')[0].getAttribute('href');

                        console.log('Download location:', downloadLocation);
                        converToPdfViaUrl(`https://ytdlp.online${downloadLocation}`);
                    }
                    setMessages(prev => [...prev, chunk]);
                } catch (e) {
                    console.error('Error parsing chunk:', e);
                }
            }

        } catch (err) {
            console.error('Error fetching stream:', err);
       }
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
                                <input type="file" className="file-input file-input-primary" ref={fileInputRef} />
                                <div className='relative mt-2'>
                                    <button onClick={() => convertToPdfViaFile()} className="btn btn-secondary w-1/2">Get Document</button>
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
                                    <input ref={urlInputRef} type="text" className="grow" placeholder="... add your link here" />
                                </label>
                                <div className='relative mt-2'>
                                    <button onClick={() => ytdlpDownload()} className="btn btn-secondary w-1/2">Get Document</button>
                                    <div className="tooltip absolute ml-2 h-full" data-tip="When you click on get document, the ffmpeg processing library [~31 mb] will be downloaded to process your request on your own machine.">
                                        <div className='flex items-center justify-center h-full w-6'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                          e             </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className='mt-2'>
                                        {
                                            messages.map((message, index) => (
                                                <div key={index} className="alert alert-info shadow-lg">
                                                    <div>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                        <span dangerouslySetInnerHTML={ { __html: DOMpurify.sanitize(message) } }></span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

  )
}
