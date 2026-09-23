import {
    MdAdd,
    MdBadge,
    MdCalendarToday,
    MdCheck,
    MdClose,
    MdDownload,
    MdEditSquare,
    MdMeetingRoom,
    MdPerson,
    MdSave,
} from "react-icons/md";

import type { IconType } from "react-icons";

interface DicionarioDeIcones {
    Funcionario: IconType;
    Cargo: IconType;
    Departamento: IconType;
    Editar: IconType;
    Adicionar: IconType;
    Salvar: IconType;
    Download: IconType;
    Fechar: IconType;
    Confirmar: IconType;
    Calendario: IconType;
}

export const AppIcons: DicionarioDeIcones = {
    Funcionario: MdPerson,
    Cargo: MdBadge,
    Departamento: MdMeetingRoom,
    Editar: MdEditSquare,
    Adicionar: MdAdd,
    Salvar: MdSave,
    Download: MdDownload,
    Fechar: MdClose,
    Confirmar: MdCheck,
    Calendario: MdCalendarToday,
};
