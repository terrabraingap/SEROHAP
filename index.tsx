import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [outputWidth, setOutputWidth] = useState<number>(780);
    const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    
    // Create object URLs for previews and clean them up
    const filePreviews = files.map(file => URL.createObjectURL(file));
    useEffect(() => {
        return () => {
            filePreviews.forEach(URL.revokeObjectURL);
        };
    }, [files]);


    const addFiles = (newFiles: FileList | File[]) => {
        setError(null);
        const fileArray = Array.from(newFiles);
        const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

        if (files.length + imageFiles.length > 10) {
            setError('최대 10개의 이미지만 추가할 수 있습니다.');
            return;
        }
        setFiles(prev => [...prev, ...imageFiles]);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(e.target.files);
            // Reset input value to allow selecting the same file again
            e.target.value = '';
        }
    };
    
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files) {
            addFiles(e.dataTransfer.files);
        }
    };
    
    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newFiles = [...files];
        const draggedItemContent = newFiles.splice(dragItem.current, 1)[0];
        newFiles.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setFiles(newFiles);
    };

    const handleMerge = async () => {
        if (files.length === 0) {
            setError('합칠 이미지를 하나 이상 선택해주세요.');
            return;
        }
        if (outputWidth < 100 || outputWidth > 2000) {
            setError('가로 사이즈는 100px에서 2000px 사이여야 합니다.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context를 가져올 수 없습니다.');

            const loadedImages = await Promise.all(
                files.map(file => {
                    return new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = (err) => reject(err);
                        img.src = URL.createObjectURL(file);
                    });
                })
            );

            let totalHeight = 0;
            const scaledHeights = loadedImages.map(img => {
                const scaleRatio = outputWidth / img.naturalWidth;
                const height = img.naturalHeight * scaleRatio;
                totalHeight += height;
                return height;
            });

            canvas.width = outputWidth;
            canvas.height = totalHeight;
            ctx.fillStyle = 'white'; // Set a default background color
            ctx.fillRect(0, 0, canvas.width, canvas.height);


            let currentY = 0;
            loadedImages.forEach((img, index) => {
                const height = scaledHeights[index];
                ctx.drawImage(img, 0, currentY, outputWidth, height);
                currentY += height;
                URL.revokeObjectURL(img.src);
            });

            const mimeType = `image/${outputFormat}`;
            const dataUrl = canvas.toDataURL(mimeType, outputFormat === 'jpeg' ? 0.92 : undefined);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `merged-image.${outputFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error(err);
            setError('이미지 처리 중 오류가 발생했습니다. 파일 형식이 올바른지 확인해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container">
            <header>
                <h1>이미지 세로 합치기</h1>
                <p>여러 이미지를 하나의 긴 세로 이미지로 합쳐보세요.</p>
            </header>
            <main className="card">
                <section className="settings-grid">
                     <div className="form-group">
                        <label htmlFor="output-width">가로 사이즈 (px)</label>
                        <input
                            type="number"
                            id="output-width"
                            value={outputWidth}
                            onChange={(e) => setOutputWidth(parseInt(e.target.value, 10) || 0)}
                            min="100"
                            max="2000"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="output-format">저장 형식</label>
                        <select
                            id="output-format"
                            value={outputFormat}
                            onChange={(e) => setOutputFormat(e.target.value as 'jpeg' | 'png')}
                        >
                            <option value="jpeg">JPEG</option>
                            <option value="png">PNG</option>
                        </select>
                    </div>
                </section>
                <section>
                     <div
                        className={`drop-zone ${isDraggingOver ? 'drag-over' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>
                        <span>이미지를 여기로 드래그하거나 클릭해서 선택하세요.</span>
                        <small>최대 10개까지 추가할 수 있습니다.</small>
                         <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </section>
                {files.length > 0 && (
                    <section className="file-preview-list">
                        {files.map((file, index) => (
                            <div 
                                className="file-preview-item"
                                key={`${file.name}-${index}`}
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleDragSort}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <div className="drag-handle">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m-2-4a.5.5 0 0 1 .5-.5h14a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5m2-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>
                                </div>
                                <img src={filePreviews[index]} alt={file.name} className="thumbnail" />
                                <div className="file-info">
                                    <span className="file-name" title={file.name}>{file.name}</span>
                                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                                <button className="remove-btn" onClick={() => handleRemoveFile(index)} aria-label={`${file.name} 삭제`}>
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
                                </button>
                            </div>
                        ))}
                    </section>
                )}

                {error && <div role="alert" className="error-message">{error}</div>}

                <button className="merge-btn" onClick={handleMerge} disabled={isLoading || files.length === 0}>
                    {isLoading ? (
                        <>
                            <div className="spinner"></div>
                            <span>합치는 중...</span>
                        </>
                    ) : `이미지 ${files.length}개 합치기`}
                </button>
            </main>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
