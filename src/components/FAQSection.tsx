"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Apakah diperbolehkan bagi peserta Gelombang Pertama untuk mendaftar kembali di Gelombang Kedua apabila dinyatakan tidak lolos di Gelombang Pertama?",
    a: "Iya, bagi peserta Gelombang Pertama apabila dinyatakan tidak lolos diperkenankan untuk mengikuti Gelombang Kedua.",
  },
  {
    q: "Apakah pendaftaran NCC berbayar?",
    a: "Untuk pendaftaran NCC gratis, tetapi apabila peserta dinyatakan lolos ke Tahap 2 dikenakan pembayaran sebesar Rp 50.000.",
  },
  {
    q: "Apakah ada ganti untuk biaya tiket transportasi?",
    a: "Tidak ada, namun hanya terdapat subsidi transportasi yang disesuaikan dengan region (wilayah) masing-masing.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 py-12 h-full flex flex-col justify-center overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center mb-8 sm:mb-12">
        <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Frequently <span className="text-indigo-600">Asked</span> Question
        </h2>
        <p className="text-slate-600 text-lg">
          Ada pertanyaan? Cek FAQ berikut sebelum mengirimkan support ticket.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`bg-white border rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm ${isOpen ? 'border-indigo-200 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <button
                className="w-full px-6 py-6 flex items-center justify-between focus:outline-none"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="text-left font-bold text-slate-800 pr-8">{faq.q}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 pt-2 text-slate-600 text-sm leading-relaxed border-t border-slate-100 mt-2">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
