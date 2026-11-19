import {
	BoxIcon,
	BracesIcon,
	GlassesIcon,
	PackageOpenIcon,
	PaintbrushIcon,
	PlugIcon,
	ServerIcon,
} from '@modrinth/assets'
import { defineMessages, type MessageDescriptor } from '@modrinth/ui'
import type { Component } from 'vue'

const messages = defineMessages({
	mod: {
		id: 'popup.search.type.mod',
		defaultMessage: 'Mods',
	},
	resourcepack: {
		id: 'popup.search.type.resourcepack',
		defaultMessage: 'Resource Packs',
	},
	datapack: {
		id: 'popup.search.type.datapack',
		defaultMessage: 'Data Packs',
	},
	shader: {
		id: 'popup.search.type.shader',
		defaultMessage: 'Shaders',
	},
	modpack: {
		id: 'popup.search.type.modpack',
		defaultMessage: 'Modpacks',
	},
	plugin: {
		id: 'popup.search.type.plugin',
		defaultMessage: 'Plugins',
	},
	server: {
		id: 'popup.search.type.server',
		defaultMessage: 'Servers',
	},
})

export interface ProjectType {
	// Used in project links, like /mod/sodium
	id: string
	// The project type in search filters and results
	searchType: string
	discoverPath: string
	label: MessageDescriptor
	icon: Component
}

// The website falls back to mods wherever it needs a single type
export const MOD_TYPE: ProjectType = {
	id: 'mod',
	searchType: 'mod',
	discoverPath: '/discover/mods',
	label: messages.mod,
	icon: BoxIcon,
}

export const SERVER_TYPE: ProjectType = {
	id: 'server',
	searchType: 'minecraft_java_server',
	discoverPath: '/discover/servers',
	label: messages.server,
	icon: ServerIcon,
}

// Same types and order as the discover links in the website's navigation
export const PROJECT_TYPES: ProjectType[] = [
	MOD_TYPE,
	{
		id: 'resourcepack',
		searchType: 'resourcepack',
		discoverPath: '/discover/resourcepacks',
		label: messages.resourcepack,
		icon: PaintbrushIcon,
	},
	{
		id: 'datapack',
		searchType: 'datapack',
		discoverPath: '/discover/datapacks',
		label: messages.datapack,
		icon: BracesIcon,
	},
	{
		id: 'shader',
		searchType: 'shader',
		discoverPath: '/discover/shaders',
		label: messages.shader,
		icon: GlassesIcon,
	},
	{
		id: 'modpack',
		searchType: 'modpack',
		discoverPath: '/discover/modpacks',
		label: messages.modpack,
		icon: PackageOpenIcon,
	},
	{
		id: 'plugin',
		searchType: 'plugin',
		discoverPath: '/discover/plugins',
		label: messages.plugin,
		icon: PlugIcon,
	},
	SERVER_TYPE,
]

// The website never mixes servers into a search over every type
export const ALL_TYPES = PROJECT_TYPES.filter((type) => type !== SERVER_TYPE)
