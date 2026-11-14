"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, QrCode } from "lucide-react";
import QRCode from "qrcode";

export function QRInvite({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        className="qr-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <QrCode size={16} /> Show QR invitation
      </button>
      {open && (
        <QRInviteDialog
          inviteUrl={`${window.location.origin}/#${code}`}
          onClose={close}
        />
      )}
    </>
  );
}

export function QRInviteDialog({
  inviteUrl,
  onClose,
}: {
  inviteUrl: string;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl("");
    setError("");
    QRCode.toDataURL(inviteUrl, {
      margin: 4,
      width: 280,
      color: {
        dark: "#3e5229",
        light: "#f9f9f3",
      },
    })
      .then((data) => {
        if (!cancelled) setQrDataUrl(data);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Could not generate this QR code. Copy the channel link or try again.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl, attempt]);

  useEffect(() => {
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]',
          ) || [],
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="qr-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-invite-title"
        aria-describedby="qr-invite-description"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          className="close-qr"
          aria-label="Close QR invitation"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="eyebrow">
          <QrCode size={14} />
          SCAN TO JOIN
        </div>
        <h2 id="qr-invite-title">Share your frequency</h2>
        <p className="qr-description" id="qr-invite-description">
          Point a camera at this code, or copy the link below.
        </p>
        {qrDataUrl ? (
          <div className="qr-code-container">
            <img src={qrDataUrl} alt="QR code for channel invitation" />
          </div>
        ) : error ? (
          <div className="qr-failure">
            <p role="alert">{error}</p>
            <button
              className="qr-trigger"
              onClick={() => setAttempt((v) => v + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="qr-code-container qr-loading" role="status">
            Generating code…
          </div>
        )}
        <div className="qr-url">
          <span>CHANNEL LINK</span>
          <input
            type="text"
            value={inviteUrl}
            readOnly
            onClick={(e) => e.currentTarget.select()}
            aria-label="Channel invitation URL"
          />
        </div>
        <p className="qr-privacy-note">
          Generated on this device. Only share with your crew. Private site
          access still applies.
        </p>
      </div>
    </div>
  );
}
