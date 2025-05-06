import { useState } from 'react';
import { useOutletContext } from "react-router-dom";
import { useAuthRequest } from './useAuthRequest';
import SparkMD5 from 'spark-md5';

export function useS3Upload() {
    const [uploadProgress, setUploadProgress] = useState({});
    const [errors, setErrors] = useState({});
    const [files, setFiles] = useState([])
    const { user } = useOutletContext();
    const { authFetch } = useAuthRequest(user);

    async function calculateHash(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
                resolve(SparkMD5.ArrayBuffer.hash(e.target.result));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async function uploadFile(file, presignedPost, onProgress) {
        const formData = new FormData();
        Object.entries(presignedPost.fields).forEach(([key, value]) => {
            formData.append(key, value);
        });
        formData.append('file', file);

        await fetch(presignedPost.url, {
            method: 'POST',
            body: formData,
        });

        onProgress(100); // TODO: improve this with real progress tracking
    }

    async function handleUploads(newFiles, topicId) {
        const fileArgs = await Promise.all(newFiles.map(async file => {
            file.hash = await calculateHash(file);
            return { file: file.name, type: file.type, md5_hash: file.hash };
        }));
        setFiles(files.concat(newFiles))

        const response = await authFetch(`/sign_s3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: fileArgs, topic_id: topicId })
        });

        const signedResponses = await response.json();

        const uploadPromises = signedResponses.map(async (signedData, index) => {
            const file = newFiles[index];
            if (signedData.upload_required) {
                try {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                    await uploadFile(file, signedData.presigned_post, (val) => {
                        setUploadProgress(prev => ({ ...prev, [file.name]: val }));
                    });
                } catch (error) {
                    setErrors(prev => ({ ...prev, [file.name]: error.message }));
                }
            } else {
                setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
            }
        });

        await Promise.all(uploadPromises);
    }

    return { uploadProgress, errors, handleUploads, hash: files };
}
