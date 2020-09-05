import { ViewChild, ElementRef, Output, Input } from '@angular/core';
import { MatSlider } from '@angular/material/slider';
import { Track } from '../../model/track.model';
import { Subject } from 'rxjs';

export class BaseAudioPlayerFunctions {

    @Output()
    trackEnded: Subject<string> = new Subject<string>();

    @ViewChild('audioPlayer', { static: true }) player: ElementRef;
    timeLineDuration: MatSlider;

    iOS = (/iPad|iPhone|iPod/.test(navigator.platform)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    loaderDisplay = false;
    isPlaying = false;
    currentTime = 0;
    volume = 0.1;
    duration = 0.01;

    @Input()
    public endOffset = 0;

    currTimePosChanged(event) {
        this.player.nativeElement.currentTime = event.value;
    }

    bindPlayerEvent(): void {

        this.player.nativeElement.addEventListener('playing', () => {
            this.isPlaying = true;
            this.duration = Math.floor(this.player.nativeElement.duration);
        });
        this.player.nativeElement.addEventListener('pause', () => {
            this.isPlaying = false;
        });
        this.player.nativeElement.addEventListener('timeupdate', () => {
            this.currentTime = Math.floor(this.player.nativeElement.currentTime);
            // BUG: Commenting for `ended` event not firing #66
            // if (this.currentTime >= this.duration - this.endOffset) {
            //     this.player.nativeElement.pause();
            // }
        });
        this.player.nativeElement.addEventListener('volume', () => {
            this.volume = Math.floor(this.player.nativeElement.volume);
        });
        if (!this.iOS) {
            this.player.nativeElement.addEventListener('loadstart', () => {
                this.loaderDisplay = true;
            });
        }
        this.player.nativeElement.addEventListener('loadeddata', () => {
            this.loaderDisplay = false;
            this.duration = Math.floor(this.player.nativeElement.duration);
        });
        this.player.nativeElement.addEventListener('ended', () => {
            this.trackEnded.next('ended');
        });

    }

    playBtnHandler(): void {
        if (this.loaderDisplay) {
            return;
        }
        if (this.player.nativeElement.paused) {
            this.player.nativeElement.play(this.currentTime);
        } else {
            this.currentTime = this.player.nativeElement.currentTime;
            this.player.nativeElement.pause();
        }
    }

    play(track?: Track): void {
        setTimeout(() => {
            this.player.nativeElement.play();
        }, 0);
    }

    toggleVolume() {
        if (this.volume === 0) {
            this.setVolume(1.0);
        } else {
            this.setVolume(0);
        }
    }

    private setVolume(vol) {
        this.volume = vol;
        this.player.nativeElement.volume = this.volume;
    }

}
