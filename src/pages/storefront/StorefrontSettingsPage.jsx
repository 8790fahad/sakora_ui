import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Copy, Store, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { shareShopText, whatsappLink, copyText, asSettings, shopUrl } from "../../utils/share";

const StorefrontSettingsPage = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery("storefront-settings", api.storefront.settings);
  const settings = data?.data || {};
  const [form, setForm] = useState({
    enabled: false,
    slug: "",
    tagline: "",
    shippingFee: 0,
    whatsapp: "",
    instagram: "",
    squadEnabled: false,
    squadPublicKey: "",
    squadSecretKey: "",
    squadHasSecret: false,
  });

  useEffect(() => {
    if (!data?.data) return;
    const shopSettings = asSettings(data.data.settings);
    setForm({
      enabled: Boolean(data.data.enabled),
      slug: data.data.slug || "",
      tagline: shopSettings.tagline || "",
      shippingFee: shopSettings.shippingFee || 0,
      whatsapp: shopSettings.whatsapp || "",
      instagram: shopSettings.instagram || "",
      squadEnabled: Boolean(data.data.squad?.enabled),
      squadPublicKey: data.data.squad?.publicKey || "",
      squadSecretKey: "",
      squadHasSecret: Boolean(data.data.squad?.hasSecret),
    });
  }, [data]);

  const save = useMutation(api.storefront.updateSettings, {
    onSuccess: () => {
      toast.success("Storefront updated");
      setForm((prev) => ({ ...prev, squadSecretKey: "" }));
      queryClient.invalidateQueries("storefront-settings");
    },
    onError: (error) => {
      toast.error(error.message || "Could not save the storefront");
    },
  });

  const url = settings.url || (form.slug ? shopUrl(form.slug) : "");

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold">Your shop</h1>
        <p className="text-slate-500 mb-6">
        Share a link, sell on WhatsApp, and collect invoice payments with your own Squad account.
      </p>

      <div className="bg-white rounded-2xl border p-5 space-y-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-medium block">Enable storefront</span>
            <span className="text-sm text-slate-500">
              Turning this on switches the shop to online only, so sales update the storefront immediately.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
        </label>
        <div>
          <label className="text-sm text-slate-500">Shop slug</label>
          <input
            className="w-full border rounded-xl px-3 py-2 mt-1"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-slate-500">Tagline</label>
          <input
            className="w-full border rounded-xl px-3 py-2 mt-1"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-slate-500">WhatsApp number</label>
          <input
            className="w-full border rounded-xl px-3 py-2 mt-1"
            placeholder="0803..."
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-slate-500">Instagram</label>
          <input
            className="w-full border rounded-xl px-3 py-2 mt-1"
            placeholder="@yourshop"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm text-slate-500">Shipping fee</label>
          <input
            type="number"
            className="w-full border rounded-xl px-3 py-2 mt-1"
            value={form.shippingFee}
            onChange={(e) =>
              setForm({ ...form, shippingFee: e.target.value })
            }
          />
        </div>
        <div className="border-t pt-4 space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="font-medium block">Enable Squad</span>
              <span className="text-sm text-slate-500">
                Invoice and shop payments use these keys. The secret is encrypted before it is saved.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.squadEnabled}
              onChange={(e) => setForm({ ...form, squadEnabled: e.target.checked })}
            />
          </label>
          <div>
            <label className="text-sm text-slate-500">Squad public key</label>
            <input
              className="w-full border rounded-xl px-3 py-2 mt-1"
              autoComplete="off"
              placeholder="pk_..."
              value={form.squadPublicKey}
              onChange={(e) => setForm({ ...form, squadPublicKey: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-500">Squad secret key</label>
            <input
              type="password"
              className="w-full border rounded-xl px-3 py-2 mt-1"
              autoComplete="new-password"
              placeholder={
                form.squadHasSecret
                  ? "Saved. Enter a new key only to replace it"
                  : "sk_..."
              }
              value={form.squadSecretKey}
              onChange={(e) => setForm({ ...form, squadSecretKey: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-xl p-3">
          <Store className="w-4 h-4" />
          <span className="truncate flex-1">{url}</span>
          <button
            type="button"
            onClick={async () => {
              await copyText(url);
              toast.success("Link copied");
            }}
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        {url && (
          <button
            type="button"
            onClick={() => {
              window.open(
                whatsappLink("", shareShopText(form.slug || "my shop", url)),
                "_blank"
              );
            }}
            className="w-full py-3 rounded-xl bg-green-600 text-white flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Share shop on WhatsApp
          </button>
        )}
        <button
          onClick={() =>
            save.mutate({
              enabled: form.enabled,
              slug: form.slug,
              settings: {
                tagline: form.tagline,
                shippingFee: parseFloat(form.shippingFee) || 0,
                whatsapp: form.whatsapp,
                instagram: form.instagram,
              },
              squad: {
                enabled: form.squadEnabled,
                publicKey: form.squadPublicKey,
                ...(form.squadSecretKey.trim()
                  ? { secretKey: form.squadSecretKey.trim() }
                  : {}),
              },
            })
          }
          className="w-full py-3 rounded-xl bg-teal-600 text-white"
        >
          Save storefront
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-blue-600"
          >
            Open shop
          </a>
        )}
      </div>
    </div>
  );
};

export default StorefrontSettingsPage;
