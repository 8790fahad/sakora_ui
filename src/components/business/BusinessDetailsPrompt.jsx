import React, { useEffect, useRef, useState } from "react";
import { Building2, Plus, Trash2, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-hot-toast";
import api from "../../services/api";

const splitPhones = (value) =>
  String(value || "")
    .split(/[\n,;/|]+/)
    .map((phone) => phone.trim())
    .filter(Boolean);

const uniquePhones = (...groups) => {
  const list = [];
  groups.flat().forEach((value) => {
    splitPhones(value).forEach((phone) => {
      if (!list.includes(phone)) list.push(phone);
    });
  });
  return list;
};

const phonesFrom = (business) => {
  const saved = uniquePhones(
    Array.isArray(business?.phones) ? business.phones : [],
    business?.phone
  );
  return saved.length ? saved : [""];
};

const BusinessDetailsPrompt = ({ business, onLater }) => {
  const logoInputRef = useRef(null);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    description: business?.description || "",
    registrationNumber: business?.registrationNumber || "",
    phones: phonesFrom(business),
    logo: business?.logo || "",
  });

  useEffect(() => {
    setDraft((prev) => {
      const incoming = phonesFrom(business).filter((phone) => phone);
      const current = uniquePhones(prev.phones);
      const phones = uniquePhones(current, incoming);
      const blanks = (prev.phones || []).filter((phone) => !String(phone || "").trim())
        .length;
      const nextPhones = [...(phones.length ? phones : []), ...Array(blanks).fill("")];
      return {
        ...prev,
        phones: nextPhones.length ? nextPhones : [""],
        description: prev.description || business?.description || "",
        registrationNumber:
          prev.registrationNumber || business?.registrationNumber || "",
        logo: prev.logo || business?.logo || "",
      };
    });
  }, [business]);

  const saveMutation = useMutation(api.settings.updateBusiness, {
    onSuccess: () => {
      toast.success("Business details saved");
      queryClient.invalidateQueries("settings");
    },
    onError: (error) => {
      toast.error(error.message || "Could not save business details");
    },
  });

  const readLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setDraft((prev) => ({
        ...prev,
        logo: canvas.toDataURL("image/jpeg", 0.85),
      }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Could not read that image");
    };
    img.src = url;
  };

  const save = () => {
    const phones = uniquePhones(draft.phones);
    saveMutation.mutate({
      description: draft.description.trim(),
      registrationNumber: draft.registrationNumber.trim(),
      phones,
      phone: phones[0] || "",
      logo: draft.logo || "",
      settings: { needsProfileDetails: false },
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-5"
        role="dialog"
        aria-labelledby="business-details-title"
      >
        <h2
          id="business-details-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Finish your business profile
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Add the rest of your business details. You can change these later in
          Settings.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
            {draft.logo ? (
              <img src={draft.logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                readLogoFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {draft.logo ? "Change logo" : "Add logo"}
              </button>
              {draft.logo ? (
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-red-600"
                  onClick={() => setDraft((prev) => ({ ...prev, logo: "" }))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business description
        </label>
        <textarea
          className="form-input mb-4"
          rows={3}
          maxLength={1000}
          value={draft.description}
          placeholder="What your business does, what you sell, and who you serve"
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, description: event.target.value }))
          }
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business number
        </label>
        <input
          type="text"
          className="form-input mb-4"
          value={draft.registrationNumber}
          placeholder="RC, BN, or registration number"
          onChange={(event) =>
            setDraft((prev) => ({
              ...prev,
              registrationNumber: event.target.value,
            }))
          }
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone numbers
        </label>
        <div className="space-y-2 mb-5">
          {draft.phones.map((phone, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="tel"
                className="form-input"
                value={phone}
                placeholder={index === 0 ? "Main phone" : "Another phone"}
                onChange={(event) =>
                  setDraft((prev) => {
                    const phones = [...prev.phones];
                    phones[index] = event.target.value;
                    return { ...prev, phones };
                  })
                }
              />
              {draft.phones.length > 1 ? (
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-red-600"
                  aria-label="Remove phone"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      phones: prev.phones.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
            onClick={() =>
              setDraft((prev) => ({ ...prev, phones: [...prev.phones, ""] }))
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add phone number
          </button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-800"
            onClick={onLater}
            disabled={saveMutation.isLoading}
          >
            Not now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saveMutation.isLoading}
          >
            {saveMutation.isLoading ? "Saving..." : "Save details"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailsPrompt;
