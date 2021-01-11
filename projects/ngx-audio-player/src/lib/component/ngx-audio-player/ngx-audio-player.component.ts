import { Component, OnInit, Input, ViewChild, Output, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { Track } from '../../model/track.model';
import { MatSlider } from '@angular/material/slider';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { AudioPlayerService } from '../../service/audio-player-service/audio-player.service';
import { Subject } from 'rxjs';

@Component({
    selector: 'mat-advanced-audio-player,ngx-audio-player',
    templateUrl: './ngx-audio-player.component.html',
    styleUrls: ['./ngx-audio-player.component.css']
})

export class AudioPlayerComponent implements OnInit, OnChanges {

    audioPlayerService: AudioPlayerService;
    constructor(elem: ElementRef) {
        if (elem.nativeElement.tagName.toLowerCase() === 'mat-advanced-audio-player') {
            console.warn(`'mat-advanced-audio-player' selector is deprecated; use 'ngx-audio-player' instead.`);
        }
        this.audioPlayerService = new AudioPlayerService();
    }

    @Input()
    set playlist(playlist: Track[]) {
        this.audioPlayerService.setPlaylist(playlist);
    }

    @ViewChild(MatPaginator, { static: false }) set matPaginator(mp: MatPaginator) {
        this.paginator = mp;
        this.setDataSourceAttributes();
    }

    displayedColumns: string[];
    dataSource = new MatTableDataSource<Track>();
    paginator: MatPaginator;

    timeLineDuration: MatSlider;

    tracks: Track[] = [];

    @Input() displayTitle = true;
    @Input() displayPlaylist = true;
    @Input() displayVolumeControls = true;
    @Input() displayVolumeSlider = false;
    @Input() pageSizeOptions = [10, 20, 30];
    @Input() expanded = true;
    @Input() autoPlay = false;
    @Input() disablePositionSlider = false;
    @Input() displayArtist = false;
    @Input() displayDuration = false;

    // Support for internationalization
    @Input() tableHeader = 'Playlist';
    @Input() titleHeader = 'Title';
    @Input() artistHeader = 'Artist';
    @Input() durationHeader = 'Duration';

    currentIndex = 0;

    @Output()
    trackEnded: Subject<string> = new Subject<string>();

    @ViewChild('audioPlayer', { static: true }) player: ElementRef;

    iOS = (/iPad|iPhone|iPod/.test(navigator.platform)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    loaderDisplay = false;
    isPlaying = false;
    currentTime = 0;
    volume = 1.0;
    toggledVolume = 1.0;
    duration = 0.01;

    private startOffsetValue = 0;
    @Input()
    set startOffset(seconds: number) {
        this.startOffsetValue = seconds;
        this.player.nativeElement.currentTime = seconds;
    }
    get startOffset(): number {
        return this.startOffsetValue;
    }

    @Input()
    public endOffset = 0;

    currTimePosChanged(event) {
        this.player.nativeElement.currentTime = event.value;
    }

    currVolumeChanged(event) {
        this.volume = event.value;
        this.toggledVolume = event.value;
        this.player.nativeElement.volume = event.value;
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
            if (this.currentTime >= this.duration - this.endOffset) {
                this.player.nativeElement.currentTime = this.startOffset;
            } else {
                this.player.nativeElement.currentTime = this.currentTime;
            }

            this.player.nativeElement.play();
        } else {
            this.currentTime = this.player.nativeElement.currentTime;
            this.player.nativeElement.pause();
        }
    }

    play(track?: Track): void {

        if (track) {
            this.startOffset = track.startOffset || 0;
            this.endOffset = track.endOffset || 0;
        }

        setTimeout(() => {
            this.player.nativeElement.play();
        }, 50);

    }

    toggleVolume() {
        if (this.volume === 0) {
            this.setVolume(this.toggledVolume);
        } else {
            this.toggledVolume = this.volume;
            this.setVolume(0);
        }
    }

    private setVolume(vol) {
        this.volume = vol;
        this.player.nativeElement.volume = this.volume;
    }

    ngOnInit() {

        this.bindPlayerEvent();

        // auto play next track
        this.player.nativeElement.addEventListener('ended', () => {
            if (this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
                this.nextSong();
            }
        });

        this.player.nativeElement.addEventListener('timeupdate', () => {
            this.audioPlayerService.setCurrentTime(this.player.nativeElement.currentTime);
        });

        // Subscribe to playlist observer from AudioPlayerService and
        // update the playlist within MatAdvancedAudioPlayerComponent
        this.audioPlayerService.getPlaylist().subscribe(tracks => {
            if (tracks !== null && tracks !== []) {
                this.tracks = tracks;
                this.initialize();
            }
        });

    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.hasOwnProperty('displayArtist') || changes.hasOwnProperty('displayDuration')) {
            this.buildDisplayedColumns();
        }
    }

    private buildDisplayedColumns() {
        this.displayedColumns = ['title'];
        if (this.displayArtist) {
            this.displayedColumns.push('artist');
        }
        if (this.displayDuration) {
            this.displayedColumns.push('duration');
        }
        this.displayedColumns.push('status');
    }

    initialize() {
        this.buildDisplayedColumns();

        // populate indexs for the track and configure
        // material table data source and paginator
        this.setDataSourceAttributes();


        this.player.nativeElement.currentTime = this.startOffset;
        this.updateCurrentTrack();

        if (this.autoPlay) {
            this.play();
        }
    }

    setDataSourceAttributes() {
        let index = 1;
        if (this.tracks) {
            this.tracks.forEach((track: Track) => {
                track.index = index++;
            });
            this.dataSource = new MatTableDataSource<Track>(this.tracks);
            this.dataSource.paginator = this.paginator;
        }
    }

    nextSong(): void {
        if (this.displayPlaylist === true
            && (((this.currentIndex + 1) % this.paginator.pageSize) === 0
                || (this.currentIndex + 1) === this.paginator.length)) {
            if (this.paginator.hasNextPage()) {
                this.paginator.nextPage();
            } else if (!this.paginator.hasNextPage()) {
                this.paginator.firstPage();
            }
        }
        this.currentTime = 0;
        this.duration = 0.01;
        if ((this.currentIndex + 1) >= this.tracks.length) {
            this.currentIndex = 0;
        } else {
            this.currentIndex++;
        }
        this.updateCurrentTrack();
        this.play();
    }

    previousSong(): void {
        this.currentTime = 0;
        this.duration = 0.01;
        if (!this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
            if (this.displayPlaylist === true
                && (((this.currentIndex) % this.paginator.pageSize) === 0
                    || (this.currentIndex === 0))) {
                if (this.paginator.hasPreviousPage()) {
                    this.paginator.previousPage();
                } else if (!this.paginator.hasPreviousPage()) {
                    this.paginator.lastPage();
                }
            }
            if ((this.currentIndex - 1) < 0) {
                this.currentIndex = (this.tracks.length - 1);
            } else {
                this.currentIndex--;
            }
        } else {
            this.resetSong();
        }
        this.updateCurrentTrack();
        this.play();
    }

    resetSong(): void {
        this.player.nativeElement.src = this.tracks[this.currentIndex].link;
    }

    selectTrack(index: number): void {
        this.currentIndex = index - 1;
        this.updateCurrentTrack();
        this.play();
    }

    checkIfSongHasStartedSinceAtleastTwoSeconds(): boolean {
        return this.player.nativeElement.currentTime > 2;
    }

    updateCurrentTrack() {
        this.audioPlayerService.setCurrentTrack(this.tracks[this.currentIndex]);
    }

}
