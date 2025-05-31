import { useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Navigation from './components/Navigation';
import ActionComponent from './components/ActionComponent';

function App() {
      return (
        <div>
            <Navigation />
            <ActionComponent/>
        
        </div>
    );

    // return (loaded
    //     ? (
    //         <>
    //             <video ref={videoRef} controls></video><br />
    //             <button onClick={transcode}>Transcode webm to mp4</button>
    //             <p ref={messageRef}></p>
    //             <p>Open Developer Tools (Ctrl+Shift+I) to View Logs</p>
    //         </>
    //     )
    //     : (
    //         <button onClick={load}>Load ffmpeg-core (~31 MB)</button>
    //     )
    // );
}

export default App;