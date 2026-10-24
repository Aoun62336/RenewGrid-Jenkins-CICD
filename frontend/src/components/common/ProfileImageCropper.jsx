import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { authAPI, BASE_URL, getActiveRole } from '../../services/api';
import toast from 'react-hot-toast';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function ProfileImageCropper({
  currentImage,
  onImageUpdated,
  size = 'w-20 h-20',
}) {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  };

  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current) return;
    
    setUploading(true);
    
    // Generate Blob
    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    const pixelRatio = window.devicePixelRatio;
    canvas.width = completedCrop.width * pixelRatio;
    canvas.height = completedCrop.height * pixelRatio;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Canvas is empty');
        setUploading(false);
        return;
      }
      const file = new File([blob], 'profile.png', { type: 'image/png' });
      
      try {
        const res = await authAPI.uploadProfileImage(file);
        // Backend returns relative path e.g. "/uploads/profile_images/user_1_abc.png"
        const relativePath = res.profile_image;
        const fullUrl = relativePath
          ? (relativePath.startsWith('http') ? relativePath : `${BASE_URL}${relativePath}`)
          : null;

        if (!fullUrl) {
          toast.error('Upload succeeded but no image URL returned');
          setUploading(false);
          return;
        }

        // Notify parent with the full URL so avatar updates immediately
        if (onImageUpdated) onImageUpdated(fullUrl);

        // Sync localStorage so sidebar reflects new photo
        const role = getActiveRole();
        try {
          const stored = JSON.parse(localStorage.getItem(role) || '{}');
          stored.profile_image = relativePath;
          localStorage.setItem(role, JSON.stringify(stored));
        } catch { /* ignore storage errors */ }

        setIsModalOpen(false);
        setImgSrc('');
        toast.success('Profile photo updated!');
      } catch (err) {
        toast.error(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    }, 'image/png');
  };

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className={`${size} mx-auto bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40 overflow-hidden relative`}>
          {currentImage ? (
            <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-4xl">person</span>
          )}
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-white text-sm">photo_camera</span>
            <span className="text-[10px] text-white font-bold uppercase mt-1">Upload</span>
          </div>
        </div>
      </div>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onSelectFile} 
        className="hidden" 
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-black">
            <h3 className="text-xl font-bold mb-4">Crop Profile Photo</h3>
            <div className="max-h-[60vh] overflow-auto flex justify-center bg-slate-100 rounded-lg p-2">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  style={{ maxHeight: '50vh' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                type="button" 
                onClick={() => { setIsModalOpen(false); setImgSrc(''); }}
                className="px-6 py-2 border border-slate-300 rounded-xl font-bold hover:bg-slate-50 transition-all text-slate-700"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleUpload}
                disabled={uploading}
                className="px-6 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {uploading ? (
                   <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Saving...</>
                ) : (
                  'Save Photo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
