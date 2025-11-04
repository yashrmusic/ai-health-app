// Native Audio Recorder Module
export class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioBlob = null;
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            throw new Error('Could not access microphone. Please check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            return this.audioBlob;
        }
        return null;
    }

    getRecordingDuration() {
        // This would need to track start/end times
        return 0;
    }

    async getAudioURL() {
        if (this.audioBlob) {
            return URL.createObjectURL(this.audioBlob);
        }
        return null;
    }

    async uploadToStorage(userId, visitId, storage) {
        if (!this.audioBlob || !storage) {
            // Fallback: convert to base64 and store in Firestore
            return this.convertToBase64();
        }

        try {
            const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js");
            const timestamp = Date.now();
            const audioRef = ref(storage, `users/${userId}/visits/${visitId}/audio/${timestamp}.webm`);
            
            await uploadBytes(audioRef, this.audioBlob);
            const downloadURL = await getDownloadURL(audioRef);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading audio:', error);
            return this.convertToBase64();
        }
    }

    async convertToBase64() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.audioBlob);
        });
    }

    reset() {
        this.audioChunks = [];
        this.audioBlob = null;
        this.isRecording = false;
    }
}

