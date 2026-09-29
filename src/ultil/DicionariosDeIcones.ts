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
    MdFingerprint,
    MdShield,
    MdSchedule,
    MdOutlineKeyboardArrowDown,

} from "react-icons/md";

import { RiPresentationFill } from "react-icons/ri"

import { LuPresentation } from "react-icons/lu"

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
    Marcacoes: IconType;
    Eventos_Rep: IconType;
    Ajustes_Relogio: IconType;
    Flecha_ordenar: IconType;
    Show_case: IconType;
    Show_case_item: IconType;
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
    Marcacoes: MdFingerprint,
    Eventos_Rep: MdShield,
    Ajustes_Relogio: MdSchedule,
    Flecha_ordenar: MdOutlineKeyboardArrowDown,
    Show_case: RiPresentationFill,
    Show_case_item: LuPresentation,
};
