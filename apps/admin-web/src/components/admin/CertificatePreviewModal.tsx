import React from 'react';
import { Modal } from '../ui/Modal';
import type { CertificateMetadata } from '@shared/lib/CertificateService';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateMetadata | null;
}

export function CertificatePreviewModal({ isOpen, onClose, certificate }: CertificatePreviewModalProps) {
  if (!isOpen || !certificate) return null;

  const getCertificateSubtitle = (type: string) => {
    switch (type) {
      case 'Winner': return 'Winner';
      case 'RunnerUp': return 'Runner Up';
      case 'Participant': return 'Of Participation';
      case 'Volunteer': return 'Of Volunteering';
      case 'Judge': return 'Of Appreciation';
      case 'Mentor': return 'Of Mentorship';
      case 'Organizer': return 'Of Organization';
      case 'SpecialAward': return 'Special Award';
      default: return 'Of Participation';
    }
  };
  
  const getAchievementText = (type: string) => {
    switch(type) {
      case 'Winner': return 'for securing the winning position in';
      case 'RunnerUp': return 'for securing the runner up position in';
      case 'Participant': return 'for successfully participating in';
      case 'Volunteer': return 'for invaluable volunteering contributions to';
      case 'Judge': return 'for sharing expertise as an honorable judge at';
      case 'Mentor': return 'for outstanding guidance and mentorship at';
      case 'Organizer': return 'for exceptional leadership in organizing';
      case 'SpecialAward': return 'for outstanding achievements at';
      default: return 'for successfully participating in';
    }
  };

  const verifyUrl = (certId: string) => {
    return `https://glitch36.com/verify-certificate?id=${certId}`;
  };

  const handleDownload = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('preview-cert-template');
      if (!element) return;
      
      const opt = {
        margin:       0,
        filename:     `GLITCH36_${certificate.type}_Certificate_${certificate.ownerName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 3, useCORS: true, backgroundColor: '#000000' },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
    }
  };

  // The template is designed for exactly 1123x794 (A4 landscape at 96 DPI).
  // We'll scale it down to fit in the modal.
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${certificate.type} Certificate`} maxWidth="5xl">
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} variant="primary" leftIcon={Download}>Download PDF</Button>
      </div>
      
      <div className="w-full overflow-x-auto bg-black/50 p-4 rounded-xl flex justify-center border border-white/10 custom-scrollbar">
        {/* Scale wrapper */}
        <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', width: '1123px', height: '794px', marginBottom: '-200px' }}>
          
          {/* Certificate Template */}
          <div id="preview-cert-template" style={{ 
            width: '1123px', height: '794px', 
            background: 'radial-gradient(circle at 50% 50%, #1a0802 0%, #050505 100%)', 
            position: 'relative', 
            color: '#fff', 
            boxSizing: 'border-box', 
            fontFamily: '"Inter", sans-serif', 
            overflow: 'hidden',
            border: '12px solid #e85d22',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
          }}>
            
            {/* Cyber Frame Borders */}
            <div style={{ position: 'absolute', inset: '20px', border: '2px solid rgba(232, 93, 34, 0.4)', pointerEvents: 'none', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', inset: '26px', border: '1px solid rgba(255, 255, 255, 0.1)', pointerEvents: 'none', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', top: '15px', left: '15px', width: '30px', height: '30px', borderTop: '4px solid #e85d22', borderLeft: '4px solid #e85d22', pointerEvents: 'none', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', top: '15px', right: '15px', width: '30px', height: '30px', borderTop: '4px solid #e85d22', borderRight: '4px solid #e85d22', pointerEvents: 'none', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '30px', height: '30px', borderBottom: '4px solid #e85d22', borderLeft: '4px solid #e85d22', pointerEvents: 'none', zIndex: 2 }}></div>
            <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '30px', height: '30px', borderBottom: '4px solid #e85d22', borderRight: '4px solid #e85d22', pointerEvents: 'none', zIndex: 2 }}></div>

            {/* Main Content Container */}
            <div style={{ position: 'absolute', top: '150px', left: '0', width: '100%', textAlign: 'center', zIndex: 10 }}>
              <h1 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '90px', margin: '0', color: '#fff', letterSpacing: '8px', textShadow: '0 4px 15px rgba(232, 93, 34, 0.4)' }}>CERTIFICATE</h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '5px 0 30px 0' }}>
                <div style={{ height: '2px', width: '120px', backgroundColor: '#e85d22', boxShadow: '0 0 10px #e85d22' }}></div>
                <p style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '26px', margin: '0', color: '#e85d22', letterSpacing: '8px', textTransform: 'uppercase' }}>{getCertificateSubtitle(certificate.type)}</p>
                <div style={{ height: '2px', width: '120px', backgroundColor: '#e85d22', boxShadow: '0 0 10px #e85d22' }}></div>
              </div>
              
              <p style={{ fontSize: '14px', color: '#aaa', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '30px', fontWeight: 600 }}>This certificate is proudly presented to</p>
              
              <h2 style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: '64px', margin: '20px 0', color: '#fff', fontWeight: 'normal', letterSpacing: '4px' }}>
                <span style={{ color: '#e85d22', opacity: 0.7 }}>{'{ '}</span> 
                {certificate.ownerName.toUpperCase()} 
                <span style={{ color: '#e85d22', opacity: 0.7 }}>{' }'}</span>
              </h2>
              
              <div style={{ margin: '20px auto', width: '8px', height: '8px', transform: 'rotate(45deg)', backgroundColor: '#e85d22', boxShadow: '0 0 10px #e85d22' }}></div>
              
              <p style={{ fontSize: '18px', color: '#ddd', maxWidth: '700px', margin: '0 auto', lineHeight: '1.8' }}>
                {getAchievementText(certificate.type)} <strong style={{ color: '#e85d22', fontWeight: 800 }}>PANDORA 2.0 x GLITCH 36</strong>,<br/>
                a 36-hour National-Level Hackathon, conducted by the <strong style={{ color: '#fff' }}>Department of Information Technology,</strong><br/>
                <strong style={{ color: '#e85d22' }}>JSPM's BSIOTR</strong>, Wagholi, Pune in association with <strong style={{ color: '#fff' }}>ITSA</strong>.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginTop: '35px', fontSize: '15px', fontWeight: 600, color: '#ddd', letterSpacing: '1px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#e85d22', fontSize: '18px' }}>📅</span> 10 - 11 OCTOBER 2026
                </span>
                <span style={{ color: '#e85d22', opacity: 0.5 }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#e85d22', fontSize: '18px' }}>📍</span> JSPM's BSIOTR, WAGHOLI, PUNE
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ position: 'absolute', bottom: '90px', left: '0', width: '100%', display: 'flex', justifyContent: 'center', gap: '90px', zIndex: 10 }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '60px', marginBottom: '15px', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                </div>
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>Dr. Vinod Wadne</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>HOD - IT<br/>JSPM's BSIOTR</p>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '60px', marginBottom: '15px', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                </div>
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>Dr. N. N. Ghuge</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Principal<br/>JSPM's BSIOTR</p>
              </div>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <div style={{ height: '60px', marginBottom: '15px', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                </div>
                <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '16px', color: '#fff', letterSpacing: '1px' }}>Dr. V. A. Bugade</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Campus Director<br/>JSPM, Wagholi</p>
              </div>
            </div>

            {/* Certificate ID */}
            <div style={{ position: 'absolute', bottom: '40px', left: '60px', fontSize: '13px', color: '#666', zIndex: 10, letterSpacing: '2px', fontFamily: '"Courier New", monospace' }}>
              ID: <span style={{ color: '#e85d22' }}>{certificate.certificateId}</span>
            </div>

            {/* QR Code */}
            <div style={{ position: 'absolute', bottom: '40px', right: '60px', textAlign: 'center', zIndex: 10 }}>
              <div style={{ background: '#fff', padding: '6px', display: 'inline-block', border: '2px solid #e85d22', borderRadius: '4px' }}>
                <QRCode value={verifyUrl(certificate.certificateId)} size={75} level="H" />
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase' }}>Scan to Verify</p>
            </div>

            {/* Footer Text */}
            <div style={{ position: 'absolute', bottom: '30px', left: '0', width: '100%', textAlign: 'center', fontSize: '10px', letterSpacing: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', zIndex: 10 }}>
              More than a Hackathon
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
