"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Campo de contraseña con botón de ojo para mostrar/ocultar el texto. */
export function PasswordInput({ style, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...props} type={show ? "text" : "password"} style={{ ...style, paddingRight: 44 }} />
      <button
        type="button"
        className="pass-eye"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
        aria-controls={props.id}
      >
        <i className={show ? "ph ph-eye-slash" : "ph ph-eye"} style={{ fontSize: 17 }} />
      </button>
    </div>
  );
}
