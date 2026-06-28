export async function resizeImage(file, maxSize = 512) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale proportionally
            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Canvas conversion failed.'));
                const resizedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                resolve(resizedFile);
            }, 'image/jpeg', 0.85); // compression 85%
        };

        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}
