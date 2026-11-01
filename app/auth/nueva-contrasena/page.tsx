import { SetPasswordForm } from "./SetPasswordForm";

export const metadata = { title: "Crear contraseña · Panel Thomas Mata S.A." };

/** Destino de la invitación al equipo y de "¿Olvidaste tu contraseña?". */
export default function NewPasswordPage() {
  return (
    <div className="login">
      <div className="login-art">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=75" alt="" />
        <div className="login-art-shade" />
      </div>
      <div className="login-side"><SetPasswordForm /></div>
    </div>
  );
}
